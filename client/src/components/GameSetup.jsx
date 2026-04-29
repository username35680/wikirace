import { useState, useEffect, useRef } from 'react';

const WikiSearch = ({ label, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const url = `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`;
      const res = await fetch(url);
      const [, titles] = await res.json();
      setResults(titles);
    }, 300);
  }, [query]);

  const handleSelect = (title) => {
    setSelected(title);
    setQuery(title);
    setResults([]);
    onSelect(title);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '1rem' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.75rem', 
        color: 'var(--text)', 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        marginBottom: '6px'
      }}>
        {label}
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
        placeholder="Rechercher une page Wikipedia..."
      />
      {results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '4px',
          margin: '4px 0 0',
          listStyle: 'none',
          zIndex: 10,
        }}>
          {results.map((title) => (
            <li
              key={title}
              onClick={() => handleSelect(title)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderRadius: '6px',
                color: 'var(--text-h)',
                fontSize: '0.9rem',
              }}
              onMouseEnter={e => e.target.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              {title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const GameSetup = ({ onStart, onChange, isHost, config }) => {
  const [startPage, setStartPage] = useState(null);
  const [endPage, setEndPage] = useState(null);

  const handleStartSelect = (title) => {
    setStartPage(title);
    onChange?.({ startPage: title, endPage });
  };

  const handleEndSelect = (title) => {
    setEndPage(title);
    onChange?.({ startPage, endPage: title });
  };

  const canStart = startPage && endPage && startPage !== endPage;

  if (!isHost) {
    return (
      <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
        <h3>Configuration de la partie</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ConfigDisplay label="Page de départ" value={config?.startPage} />
          <ConfigDisplay label="Page d'arrivée" value={config?.endPage} />
        </div>
        <p style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: '1rem' }}>
          En attente du lancement par l'hôte...
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
      <h3>Configurer la partie</h3>
      <WikiSearch label="Page de départ" onSelect={handleStartSelect} />
      <WikiSearch label="Page d'arrivée" onSelect={handleEndSelect} />
      {startPage && endPage && startPage === endPage && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>
          Les deux pages doivent être différentes
        </p>
      )}
      <button
        onClick={() => onStart(startPage, endPage)}
        disabled={!canStart}
        style={{ opacity: canStart ? 1 : 0.4, cursor: canStart ? 'pointer' : 'not-allowed' }}
      >
        Lancer la course 🚀
      </button>
    </div>
  );
};

const ConfigDisplay = ({ label, value }) => (
  <div>
    <label style={{
      display: 'block',
      fontSize: '0.75rem',
      color: 'var(--text)',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '6px'
    }}>
      {label}
    </label>
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      color: value ? 'var(--text-h)' : '#4a4a70',
      fontSize: '0.95rem',
    }}>
      {value || 'En attente...'}
    </div>
  </div>
);

export default GameSetup;