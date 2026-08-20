import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { ProgressService } from '../services/progress';
import type { Curso } from '../types';

interface ProgressoMap {
  [cursoId: string]: { progresso: number; concluido: boolean };
}

export function ContinuarAssistindoPage() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [progressoMap, setProgressoMap] = useState<ProgressoMap>({});

  useEffect(() => {
    ApiService.getCursos().then((data) => setCursos(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cursos.length) return;
    ProgressService.getMapProgressos(cursos)
      .then((mapa) => {
        const novoMapa: ProgressoMap = {};
        Object.entries(mapa).forEach(([id, p]) => {
          novoMapa[id] = { progresso: p?.progresso || 0, concluido: !!p?.concluido };
        });
        setProgressoMap(novoMapa);
      })
      .catch(() => {});
  }, [cursos]);

  const emAndamento = cursos.filter((c) => {
    const p = progressoMap[String(c.id)];
    return p && !p.concluido && p.progresso > 0 && p.progresso < 100;
  });

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Continuar Assistindo</h1>
      {emAndamento.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-book-open" style={{ fontSize: '4rem', color: 'var(--color-text-muted)', marginBottom: '10px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Você não tem nenhum curso em andamento!</p>
        </div>
      ) : (
        <div className="cursos-grid">
          {emAndamento.map((c) => {
            const p = progressoMap[String(c.id)];
            const slug = c.slug || String(c.id);
            return (
              <div key={c.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  <img src={c.thumbnail_url || ''} alt={c.titulo} loading="lazy" />
                  <span className="curso-card__status status-em-andamento">Em andamento</span>
                  <div className="curso-card__play" onClick={(e) => { e.stopPropagation(); navigate('/video-area/' + slug); }}>
                    <i className="fa-solid fa-play"></i>
                  </div>
                </div>
                <div className="curso-card__name">{c.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__progress">
                  <div className="progress__bar-track"><div className="progress__bar-fill" style={{ width: (p?.progresso || 0) + '%' }}></div></div>
                  <span>{(p?.progresso || 0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}