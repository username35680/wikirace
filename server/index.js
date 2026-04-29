const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Route scraping Wikipedia
app.get('/wiki', async (req, res) => {
  const { page } = req.query;
  try {
    const response = await fetch(`https://fr.wikipedia.org/wiki/${encodeURIComponent(page)}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Supprime les éléments inutiles
    $('.mw-editsection, #toc, .navbox, .sister-wikipedia, .bandeau-container, #catlinks, .mw-indicators').remove();

    const content = $('#mw-content-text').html();
    const cleaned = content.replace(
      /href="\/wiki\/([^"#]+)"/g,
      'href="#" data-wiki="$1"'
    );

    res.json({ content: cleaned, title: $('#firstHeading').text() });
  } catch (e) {
    res.status(500).json({ error: 'Page introuvable' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  socket.on('create_room', ({ code, username }) => {
    rooms[code] = {
      code: code,
      host: socket.id,
      players: [{ id: socket.id, username, clicks: 0 }],
      status: 'waiting'
    };
    socket.join(code);
    console.log(`Salle créée : ${code} par ${username}`);
    io.to(code).emit('room_data', rooms[code]);
  });

  socket.on('join_room', ({ code, username }) => {
    if (rooms[code]) {
      rooms[code].players.push({ id: socket.id, username, clicks: 0 });
      socket.join(code);
      io.to(code).emit('room_data', rooms[code]);
      console.log(`${username} a rejoint le salon ${code}`);
    } else {
      socket.emit('error_message', "Le salon n'existe pas !");
    }
  });

  socket.on('start_game', ({ code, startPage, endPage }) => {
    if (!rooms[code]) return;
    rooms[code].startPage = startPage;
    rooms[code].endPage = endPage;
    rooms[code].status = 'playing';
    io.to(code).emit('game_started', { startPage, endPage });
    });

    socket.on('config_update', ({ code, startPage, endPage }) => {
    if (!rooms[code]) return;
        rooms[code].startPage = startPage;
        rooms[code].endPage = endPage;
        io.to(code).emit('room_data', rooms[code]);
    });

// --- ÉVÉNEMENTS DE JEU (À SORTIR DU DISCONNECT) ---
  socket.on('player_won', ({ code, username, clicks }) => {
    if (!rooms[code] || rooms[code].status !== 'playing') return;
    rooms[code].status = 'finished';
    io.to(code).emit('game_over', { winner: username, clicks });
    console.log(`${username} a gagné dans le salon ${code} en ${clicks} clics`);
  });

  socket.on('click_update', ({ code, clicks }) => {
    if (!rooms[code]) return;
    const player = rooms[code].players.find(p => p.id === socket.id);
    if (player) {
      player.clicks = clicks;
      io.to(code).emit('room_data', rooms[code]);
    }
  });

  // --- DÉCONNEXION (UNIQUEMENT LE NETTOYAGE) ---
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    for (const code in rooms) {
      const room = rooms[code];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        if (room.players.length === 0) {
          delete rooms[code];
        } else {
          if (room.host === socket.id) room.host = room.players[0].id;
          io.to(code).emit('room_data', room);
        }
        break;
      }
    }
  });
});

server.listen(3001, () => console.log('Serveur prêt sur http://localhost:3001'));