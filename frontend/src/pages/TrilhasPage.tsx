import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import type { Trilha } from '../types';
import trilhaNaoEncontradaImg from '../assets/images/trilha-não-encontrada.png';

export function TrilhasPage() {
  const navigate = useNavigate();
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);

  useEffect(() => {
    ApiService.getTrilhas().then((data) => setTrilhas(data || [])).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#ff9d00' }}>Trilhas de Aprendizagem</h1>
      {trilhas.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 12px' }}>
          <img src={trilhaNaoEncontradaImg} alt="Nenhuma trilha" style={{ maxWidth: '70px', marginBottom: '16px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>Nenhuma trilha disponível!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {trilhas.map((t) => (
            <div key={t.id} className="trail-card" onClick={() => navigate('/trilhas/' + t.id)}>
              <div className="trail-card__icon"><i className="fas fa-route"></i></div>
              <h3>{t.nome}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}