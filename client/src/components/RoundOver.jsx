import socket from '../socket';

const RoundOver = ({ data, isHost, roomCode, mode }) => {
  const { roundResults, roundPoints, totalScores, round, totalRounds, isLastRound } = data;

  const sortedTotal = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3rem 1rem', gap: '1.5rem', minHeight: '100vh',
    }}>
      <h2 style={{ color: 'var(--accent)', margin: 0 }}>
        {isLastRound ? '🏁 Partie terminée !' : `Manche ${round} / ${totalRounds} terminée`}
      </h2>

      {/* Résultats de la manche */}
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <h3>Résultats de la manche</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {roundResults.map((r, i) => (
            <li key={r.username} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: 'var(--bg-input)',
              borderRadius: '8px', border: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--text-h)' }}>
                {r.finished ? medals[i] || `${i + 1}.` : '❌'} {r.username}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                {r.finished ? `${r.clicks} clics` : 'Non fini'}
                <span style={{
                  marginLeft: '12px', color: 'var(--accent)', fontWeight: 700,
                }}>
                  +{roundPoints[r.username] || 0} pts
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Classement général */}
      {mode === 'competitive' && (
        <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
          <h3>Classement général</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedTotal.map(([username, pts], i) => (
              <li key={username} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'var(--bg-input)',
                borderRadius: '8px', border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--text-h)' }}>
                  {medals[i] || `${i + 1}.`} {username}
                </span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{pts} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Tout le monde peut quitter */}
        <button
            onClick={() => window.location.reload()}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
            Quitter le salon
        </button>

        {/* Hôte seulement */}
        {isHost && (
            isLastRound ? (
            <button onClick={() => socket.emit('next_round', { code: roomCode, restart: true })}>
                🔄 Rejouer dans ce salon
            </button>
            ) : (
            <button onClick={() => socket.emit('next_round', { code: roomCode })}>
                Manche suivante →
            </button>
            )
        )}

        {!isHost && (
            <p style={{ color: 'var(--text)', fontStyle: 'italic', margin: 0, alignSelf: 'center' }}>
            En attente de l'hôte...
            </p>
        )}
        </div>
    </div>
  );
};

export default RoundOver;