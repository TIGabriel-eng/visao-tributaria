import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import type { Curso } from '../types';

export function CursosConcluidosPage() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [matriculas, setMatriculas] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([ApiService.getCursos(), ApiService.getMinhasMatriculas()])
      .then(([cursosData, matriculasData]) => {
        setCursos(cursosData || []);
        setMatriculas(matriculasData || []);
      })
      .catch(() => {});
  }, []);

  const concluidos = cursos.filter((c) => {
    const mat = matriculas.find((m) => m.curso === c.id);
    return mat?.concluido;
  });

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Cursos Concluídos</h1>
      {concluidos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 12px' }}>
          <i className="fa-solid fa-book-open" style={{ fontSize: '4rem', color: 'var(--color-text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>Você ainda não concluiu nenhum curso!</p>
        </div>
      ) : (
        <div className="cursos-grid">
          {concluidos.map((c) => {
            const slug = c.slug || c.id;
            return (
              <div key={c.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  <img src={c.thumbnail_url || ''} alt={c.titulo} loading="lazy" />
                  <span className="curso-card__status status-concluido">Concluído</span>
                </div>
                <div className="curso-card__name">{c.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__meta">
                  <span className="concluido-badge">Concluído</span>
                  <span className="certificado-link" onClick={(e) => { e.stopPropagation(); navigate('/certificados'); }}>
                    <i className="fa-solid fa-file-pdf"></i> Emitir Certificado
                  </span>
                </div>
                <div className="curso-card__progress">
                  <div className="progress__bar-track"><div className="progress__bar-fill" style={{ width: '100%' }}></div></div>
                  <span>100%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}