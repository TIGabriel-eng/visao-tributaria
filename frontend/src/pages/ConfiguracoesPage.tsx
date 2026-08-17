import { useState, useEffect } from 'react';

export function ConfiguracoesPage() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.style.backgroundColor = '#E6F1FB';
      document.body.style.backgroundColor = '#E6F1FB';
      document.body.style.color = '#1a1a2e';
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '24px', color: '#191919' }}>Configurações</h1>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Tema</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Alternar entre tema claro e escuro</p>
          </div>
          <button onClick={toggleTheme} style={{ padding: '8px 20px', background: 'var(--color-accent-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontWeight: 600 }}>
            {theme === 'light' ? '☀️ Claro' : '🌙 Escuro'}
          </button>
        </div>
      </div>
    </div>
  );
}