import { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import socket from './socket';
import GameSetup from './components/GameSetup';
import GameView from './components/GameView';
import RoundOver from './components/RoundOver';
import './app.css';

function App() {
  const [user, setUser] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [roundOver, setRoundOver] = useState(null);
  const [mode, setMode] = useState('normal');
  const [timer, setTimer] = useState(15);

  useEffect(() => {
    socket.on('room_data', setRoomData);
    socket.on('error_message', (msg) => alert(msg));

    socket.on('game_started', (data) => {
      setRoundOver(null);
      setGameData(data);
    });

    socket.on('round_over', (data) => {
      setGameData(null);
      setRoundOver(data);
    });

    socket.on('prepare_next_round', () => {
      setRoundOver(null);
    });

    return () => {
      socket.off('room_data');
      socket.off('error_message');
      socket.off('game_started');
      socket.off('round_over');
      socket.off('prepare_next_round');
    };
  }, []);

  const handleCreateRoom = (username) => {
    if (!username) return alert("Pseudo requis");
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit('create_room', { code, username, mode, timer });
    setUser(username);
  };

  const handleJoinRoom = (code, username) => {
    if (!code || !username) return alert("Champs requis");
    socket.emit('join_room', { code, username });
    setUser(username);
  };

  const handleStartGame = (startPage, endPage) => {
    socket.emit('start_game', { code: roomData.code, startPage, endPage });
  };

  // Écran de fin de manche
  if (roundOver && roomData) return (
    <RoundOver
      data={roundOver}
      isHost={roomData.host === socket.id}
      roomCode={roomData.code}
      mode={roomData.mode}
    />
  );

  // Jeu en cours
  if (gameData && roomData) return (
    <GameView
      startPage={gameData.startPage}
      endPage={gameData.endPage}
      roomCode={roomData.code}
      username={user}
      players={roomData.players}
      round={gameData.round}
      totalRounds={gameData.totalRounds}
      mode={gameData.mode}
      timerDuration={gameData.timer}
    />
  );

  return (
    <div className="App">
      {!roomData ? (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          mode={mode}
          onModeChange={setMode}
        />
      ) : (
        <div className="waiting-room">
          <h2>Salon : <span>{roomData.code}</span></h2>
          <p style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
            Mode : <strong style={{ color: 'var(--accent)' }}>
              {roomData.mode === 'competitive' ? '⚔️ Compétitif (5 manches)' : '🎮 Normal'}
            </strong>
          </p>
          <div className="card">
            <h3>Joueurs :</h3>
            <ul>
              {roomData.players.map((p) => (
                <li key={p.id}>
                  {p.username} {p.id === socket.id ? "(Toi)" : ""}
                </li>
              ))}
            </ul>
          </div>
          <GameSetup
            onStart={handleStartGame}
            isHost={roomData.host === socket.id}
            config={{ startPage: roomData.startPage, endPage: roomData.endPage }}
            timer={timer}
            onTimerChange={(val) => {
              setTimer(val);
              socket.emit('config_update', { code: roomData.code, startPage: roomData.startPage, endPage: roomData.endPage, timer: val });
            }}
            onChange={({ startPage, endPage }) => {
              socket.emit('config_update', { code: roomData.code, startPage, endPage, timer });
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;