import { useState } from 'react';

const Lobby = ({ onJoinRoom, onCreateRoom, mode, onModeChange }) => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');

  return (
    <div className="lobby-container">
      <h1>WikiRace Multiplayer</h1>
      <div className="card">
        <input
          type="text"
          placeholder="Ton pseudo..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <hr />
        <h3>Mode de jeu</h3>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {['normal', 'competitive'].map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                flex: 1,
                background: mode === m ? 'var(--accent)' : 'var(--bg-input)',
                border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
                color: mode === m ? 'white' : 'var(--text)',
                opacity: 1,
              }}
            >
              {m === 'normal' ? '🎮 Normal' : '⚔️ Compétitif'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
          {mode === 'competitive'
            ? '5 manches, système de points, classement final'
            : '1 manche, le premier arrivé gagne'}
        </p>
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