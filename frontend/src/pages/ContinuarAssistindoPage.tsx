import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { ProgressService } from '../services/progress';
import type { Curso } from '../types';
import cursoNaoConcluidoImg from '../assets/images/curso-não-concluído.png';

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
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#ff9d00' }}>Continuar Assistindo</h1>
      {emAndamento.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img src={cursoNaoConcluidoImg} alt="Nenhum curso em andamento" style={{ maxWidth: '160px', marginBottom: '10px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Você não tem nenhum curso em andamento!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
          {emAndamento.map((c) => {
            const p = progressoMap[String(c.id)];
            return (
              <div key={c.id} className="continuar-card">
                <div className="continuar-card__thumb">
                  <img src={c.thumbnail_url || ''} alt={c.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="continuar-card__play" onClick={() => navigate('/video-area/' + (c.slug || String(c.id)))}>
                    <i className="fa-solid fa-play"></i>
                  </div>
                </div>
                <div className="continuar-card__body">
                  <span className="continuar-card__tag">Curso</span>
                  <h3 className="continuar-card__title">{c.titulo}</h3>
                  <span className="continuar-card__progress-label">Progresso da Aula</span>
                  <div className="continuar-card__progress">
                    <div className="continuar-card__bar"><div className="continuar-card__bar-fill" style={{ width: (p?.progresso || 0) + '%' }}></div></div>
                    <span className="continuar-card__percent">{(p?.progresso || 0)}%</span>
                  </div>
                  <button className="continuar-card__btn" onClick={() => navigate('/video-area/' + (c.slug || String(c.id)))}>Retomar curso <i className="fa-solid fa-arrow-right"></i></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}