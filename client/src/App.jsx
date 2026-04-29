import { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import socket from './socket';
import GameSetup from './components/GameSetup'
import GameView from './components/GameView';

import './app.css'

function App() {
  const [user, setUser] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    socket.on('room_data', (data) => {
      setRoomData(data);
    });

    socket.on('game_started', (data) => {
      setGameData(data);
    });

    socket.on('error_message', (msg) => alert(msg));

    return () => {
      socket.off('room_data');
      socket.off('error_message');
      socket.off('game_started');
    };
  }, []);

  const handleCreateRoom = (username) => {
    if (!username) return alert("Pseudo requis");
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit('create_room', { code, username });
    setUser(username);
  };

  const handleJoinRoom = (code, username) => {
    if (!code || !username) return alert("Champs requis");
    socket.emit('join_room', { code, username });
    setUser(username);
  };

  const handleStartGame = (startPage, endPage) => {
    socket.emit('start_game', { 
      code: roomData.code, 
      startPage, 
      endPage 
    });
  };

  if (gameData && roomData) return (
    <GameView
      startPage={gameData.startPage}
      endPage={gameData.endPage}
      roomCode={roomData.code}
      username={user}
      players={roomData.players}
    />
  );

  return (
    <div className="App">
      {!roomData ? (
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      ) : (
        <div className="waiting-room">
          <h2>Salon : <span>{roomData.code}</span></h2>
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
            onChange={({ startPage, endPage }) => {
              socket.emit('config_update', { code: roomData.code, startPage, endPage });
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;