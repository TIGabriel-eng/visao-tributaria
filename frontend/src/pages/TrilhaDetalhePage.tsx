import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import type { Trilha } from '../types';
import nenhumaTrilhaImg from '../assets/images/trilha-não-encontrada.png';

export function TrilhaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trilha, setTrilha] = useState<Trilha | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErro(true);
      return;
    }
    setLoading(true);
    setErro(false);
    ApiService.getTrilha(id)
      .then((data) => setTrilha(data || null))
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 12px', color: 'var(--color-text-secondary)' }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> Carregando trilha...
      </div>
    );
  }

  if (erro || !trilha) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 12px' }}>
        <img src={nenhumaTrilhaImg} alt="Trilha não encontrada" style={{ maxWidth: '70px', marginBottom: '16px' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>Trilha não encontrada!</p>
        <button
          onClick={() => navigate('/trilhas')}
          style={{
            marginTop: '16px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-accent-2)',
            background: 'rgba(122, 82, 48, 0.12)', color: 'var(--color-accent-2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          ← Voltar para Trilhas
        </button>
      </div>
    );
  }

  const cursos = trilha.cursos || [];

  return (
    <div style={{ padding: '12px 24px' }}>
      <button
        onClick={() => navigate('/trilhas')}
        className="back-link"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: '8px' }}
      >
        <i className="fa-solid fa-arrow-left"></i> Voltar às trilhas
      </button>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px', color: '#ff9d00' }}>
          <i className="fas fa-route" style={{ marginRight: '8px' }}></i>
          {trilha.nome}
        </h1>
        {trilha.ambiente_nome && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '6px' }}>
            <i className="fa-solid fa-building-columns"></i> {trilha.ambiente_nome}
          </p>
        )}
        {trilha.descricao && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '720px' }}>{trilha.descricao}</p>
        )}
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '8px' }}>
          {cursos.length} {cursos.length !== 1 ? 'cursos' : 'curso'} nesta trilha
        </p>
      </div>

      {cursos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 12px' }}>
          <i className="fas fa-video" style={{ fontSize: '40px', color: 'var(--color-text-muted)', marginBottom: '12px' }}></i>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>
            Nenhum curso publicado disponível nesta trilha.
          </p>
        </div>
      ) : (
        <div className="cursos-grid">
          {cursos.map((c) => {
            const slug = c.slug || String(c.id);
            const thumbSrc = c.thumbnail_url || '';
            const tipoLabel = c.tipo === 'video' ? 'Vídeo' : 'Curso';
            return (
              <div key={c.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  {thumbSrc ? (
                    <img src={thumbSrc} alt={c.titulo} loading="lazy" />
                  ) : (
                    <div style={thumbPlaceholderStyle}><i className="fa-solid fa-video"></i></div>
                  )}
                  <span className="curso-card__status status-nao-iniciado">{tipoLabel}</span>
                </div>
                <div className="curso-card__name">{c.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__meta">
                  <span><i className="fa-solid fa-book"></i> Acessar curso</span>
                  <span><i className="fa-solid fa-arrow-right"></i></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const thumbPlaceholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '150px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #5C3418 0%, #3D1E0D 100%)',
  color: 'rgba(255,255,255,.35)',
  fontSize: '32px',
};