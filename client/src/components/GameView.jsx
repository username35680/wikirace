import { useState, useEffect, useRef } from 'react';
import socket from '../socket';

const GameView = ({ startPage, endPage, roomCode, username, players }) => {
  const [currentPage, setCurrentPage] = useState(startPage);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [clicks, setClicks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState([startPage]);
  const [winner, setWinner] = useState(null);
  const contentRef = useRef(null);

    const normalise = (str) => 
    decodeURIComponent(str)
        .replace(/_/g, ' ')
        .toLowerCase()
        .trim();

    const loadPage = async (page) => {
    setLoading(true);
    try {
        const res = await fetch(`http://localhost:3001/wiki?page=${encodeURIComponent(page)}`);
        const data = await res.json();
        setContent(data.content);
        setTitle(data.title);
        setCurrentPage(page);
        window.scrollTo(0, 0);

        console.log("Page actuelle:", normalise(data.title), "| Cible:", normalise(endPage)); // ← log temporaire

        if (normalise(data.title) === normalise(endPage) || 
            normalise(page) === normalise(endPage)) {
        console.log("ARRIVÉE DÉTECTÉE !"); // ← log temporaire
        socket.emit('player_won', { code: roomCode, username, clicks });
        }
    } catch (e) {
        console.error('Erreur chargement page:', e);
    }
    setLoading(false);
    };

  // Charge la page de départ
  useEffect(() => {
    loadPage(startPage);

    socket.on('game_over', (data) => {
      setWinner(data);
    });

    return () => socket.off('game_over');
  }, []);

  // Intercepte les clics sur les liens Wikipedia
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const link = e.target.closest('[data-wiki]');
      if (!link) return;
      e.preventDefault();

      const page = decodeURIComponent(link.getAttribute('data-wiki'));
      const newClicks = clicks + 1;
      setClicks(newClicks);
      setPath(prev => [...prev, page]);
      socket.emit('click_update', { code: roomCode, clicks: newClicks });
      loadPage(page);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [clicks, content]);

  if (winner) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1.5rem',
        padding: '2rem',
      }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>
          {winner.winner === username ? '🏆' : '😔'}
        </h1>
        <h2 style={{ color: 'var(--accent)' }}>
          {winner.winner === username ? 'Tu as gagné !' : `${winner.winner} a gagné !`}
        </h2>
        <p style={{ color: 'var(--text)' }}>
          En {winner.clicks} clic{winner.clicks > 1 ? 's' : ''}
        </p>
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h3>Scores</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map(p => (
              <li key={p.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text-h)',
              }}>
                <span>{p.username} {p.username === winner.winner ? '👑' : ''}</span>
                <span style={{ color: 'var(--accent)' }}>{p.clicks} clics</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header HUD */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '1px' }}>Départ</span>
          <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>{startPage}</span>
          <span style={{ color: 'var(--border)' }}>→</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '1px' }}>Arrivée</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{endPage}</span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {players.map(p => (
            <div key={p.id} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
              {p.username} <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.id === socket.id ? clicks : p.clicks}</span>
            </div>
          ))}
          <div style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            {clicks} clic{clicks > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Fil d'Ariane */}
      <div style={{
        padding: '0.5rem 1.5rem',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text)',
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {path.map((p, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {i > 0 && <span style={{ color: 'var(--border)' }}>›</span>}
            <span style={{ color: i === path.length - 1 ? 'var(--text-h)' : 'var(--text)' }}>
              {decodeURIComponent(p).replace(/_/g, ' ')}
            </span>
          </span>
        ))}
      </div>

      {/* Contenu Wikipedia */}
      <div style={{ flex: 1, padding: '2rem', maxWidth: '860px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text)' }}>
            Chargement...
          </div>
        ) : (
          <>
            <h1 style={{ 
              fontSize: '2rem', 
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
            }}>
              {title}
            </h1>
            <div
              ref={contentRef}
              className="wiki-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default GameView;