import { useState } from 'react';

const Lobby = ({ onJoinRoom, onCreateRoom }) => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');

  return (
    <div className="lobby-container">
      <h1>🌐 WikiRace Multiplayer</h1>
      <div className="card">
        <input
          type="text"
          placeholder="Ton pseudo..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <hr />
        <h3>Créer une partie</h3>
        <button onClick={() => onCreateRoom(username)}>Générer un salon</button>
        <h3>Rejoindre une partie</h3>
        <input
          type="text"
          placeholder="Code du salon (ex: AF21)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button onClick={() => onJoinRoom(roomCode, username)}>Rejoindre</button>
      </div>
    </div>
  );
};

export default Lobby;