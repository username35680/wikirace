const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get('/wiki', async (req, res) => {
  const { page } = req.query;
  try {
    const response = await fetch(`https://fr.wikipedia.org/wiki/${encodeURIComponent(page)}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('.mw-editsection, #toc, .navbox, .sister-wikipedia, .bandeau-container, #catlinks, .mw-indicators, .nmbox, .metadata').remove();
    let cleaned = $('#mw-content-text').html();
    cleaned = cleaned.replace(/src="\/\//g, 'src="https://');
    cleaned = cleaned.replace(/srcset="\/\//g, 'srcset="https://');
    cleaned = cleaned.replace(/href="\/wiki\/([^"#]+)"/g, 'href="#" data-wiki="$1"');
    res.json({ content: cleaned, title: $('#firstHeading').text() });
  } catch (e) {
    res.status(500).json({ error: 'Page introuvable' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));

const rooms = {};

function safeRoom(room) {
  const { timerHandle, ...safe } = room;
  return safe;
}

// Calcul similarité simple (caractères communs normalisés)
function similarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let matches = 0;
  for (const c of shorter) if (longer.includes(c)) matches++;
  return matches / longer.length;
}

function calcPoints(results, endPage) {
  // results = [{ username, clicks, finished, lastPage }] triés par ordre d'arrivée
  const points = {};
  const finishPoints = [50, 35, 20, 10];
  let rank = 0;

  for (const r of results) {
    let total = 0;
    if (r.finished) {
      // Points de position
      total += finishPoints[rank] || 5;
      rank++;
      // Points d'efficacité (moins de clics = mieux, base 30 pts)
      total += Math.max(0, 30 - (r.clicks - 3) * 2);
    } else {
      // Points de proximité
      const sim = similarity(r.lastPage || '', endPage);
      total += Math.round(sim * 20);
    }
    points[r.username] = total;
  }
  return points;
}

io.on('connection', (socket) => {
  console.log(`Connecté : ${socket.id}`);

  socket.on('create_room', ({ code, username, mode, timer }) => {
    rooms[code] = {
      code,
      host: socket.id,
      players: [{ id: socket.id, username, clicks: 0, lastPage: null }],
      status: 'waiting',
      mode: mode || 'normal',       // 'normal' | 'competitive'
      timer: timer || 15,           // secondes après le 1er arrivé
      round: 0,                     // manche actuelle (1-5)
      totalRounds: mode === 'competitive' ? 5 : 1,
      scores: {},                   // { username: totalPoints }
      roundResults: [],             // résultats de la manche en cours
      timerHandle: null,
    };
    socket.join(code);
    io.to(code).emit('room_data', safeRoom(rooms[code]));
  });

  socket.on('join_room', ({ code, username }) => {
    if (!rooms[code]) return socket.emit('error_message', "Salon introuvable");
    rooms[code].players.push({ id: socket.id, username, clicks: 0, lastPage: null });
    socket.join(code);
    io.to(code).emit('room_data', safeRoom(rooms[code]));
  });

  socket.on('config_update', ({ code, startPage, endPage, timer }) => {
    if (!rooms[code]) return;
    rooms[code].startPage = startPage;
    rooms[code].endPage = endPage;
    if (timer) rooms[code].timer = timer;
    io.to(code).emit('room_data', safeRoom(rooms[code]));
  });

  socket.on('start_game', ({ code, startPage, endPage }) => {
    if (!rooms[code]) return;
    const room = rooms[code];
    room.startPage = startPage;
    room.endPage = endPage;
    room.status = 'playing';
    room.round += 1;
    room.roundResults = [];
    // Reset clics
    room.players.forEach(p => { p.clicks = 0; p.lastPage = startPage; p.finished = false; });
    io.to(code).emit('game_started', {
      startPage,
      endPage,
      round: room.round,
      totalRounds: room.totalRounds,
      mode: room.mode,
      timer: room.timer,
    });
  });

  socket.on('click_update', ({ code, clicks, lastPage }) => {
    if (!rooms[code]) return;
    const player = rooms[code].players.find(p => p.id === socket.id);
    if (player) {
      player.clicks = clicks;
      if (lastPage) player.lastPage = lastPage;
      io.to(code).emit('room_data', safeRoom(rooms[code]));
    }
  });

  socket.on('player_won', ({ code, username, clicks }) => {
    const room = rooms[code];
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.username === username);
    if (player) player.finished = true;

    room.roundResults.push({ username, clicks, finished: true, lastPage: room.endPage });

    const isFirst = room.roundResults.length === 1;

    if (isFirst) {
      // Démarre le timer
      io.to(code).emit('round_timer_start', { seconds: room.timer, firstWinner: username });

      room.timerHandle = setTimeout(() => {
        endRound(code);
      }, room.timer * 1000);
    }

    io.to(code).emit('room_data', safeRoom(room));
  });

  function endRound(code) {
    const room = rooms[code];
    if (!room) return;

    // Ajoute les joueurs qui n'ont pas fini
    for (const p of room.players) {
      const alreadyIn = room.roundResults.find(r => r.username === p.username);
      if (!alreadyIn) {
        room.roundResults.push({
          username: p.username,
          clicks: p.clicks,
          finished: false,
          lastPage: p.lastPage || '',
        });
      }
    }

    // Calcule les points de cette manche
    const roundPoints = calcPoints(room.roundResults, room.endPage);

    // Ajoute au score total
    for (const [username, pts] of Object.entries(roundPoints)) {
      room.scores[username] = (room.scores[username] || 0) + pts;
    }

    const isLastRound = room.round >= room.totalRounds;
    room.status = isLastRound ? 'finished' : 'between_rounds';

    io.to(code).emit('round_over', {
      roundResults: room.roundResults,
      roundPoints,
      totalScores: room.scores,
      round: room.round,
      totalRounds: room.totalRounds,
      isLastRound,
    });
  }

    socket.on('next_round', ({ code, restart }) => {
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    
    room.status = 'waiting';
    room.players.forEach(p => { p.clicks = 0; p.finished = false; p.lastPage = null; });
    
    if (restart) {
        // Remet les scores et le round à zéro
        room.round = 0;
        room.scores = {};
        room.roundResults = [];
    }

    io.to(code).emit('room_data', safeRoom(room));
    io.to(code).emit('prepare_next_round', { 
        round: restart ? 1 : room.round + 1, 
        totalRounds: room.totalRounds 
    });
    });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        if (room.players.length === 0) {
          if (room.timerHandle) clearTimeout(room.timerHandle);
          delete rooms[code];
        } else {
          if (room.host === socket.id) room.host = room.players[0].id;
          io.to(code).emit('room_data', safeRoom(room));
        }
        break;
      }
    }
  });
});