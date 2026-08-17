import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import type { Curso } from '../types';
import nenhumCursoImg from '../assets/images/nenhum-curso.png';

export function MeusCursosPage() {
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

  const getMatricula = (cursoId: number) => matriculas.find((m) => m.curso === cursoId);

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Meus Cursos</h1>
      {cursos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 12px' }}>
          <img src={nenhumCursoImg} alt="Nenhum curso" style={{ maxWidth: '70px', marginBottom: '16px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}>Nenhum curso disponível!</p>
        </div>
      ) : (
        <div className="cursos-grid">
          {cursos.map((c) => {
            const mat = getMatricula(c.id);
            const slug = c.slug || c.id;
            const progresso = mat?.progresso || 0;
            const status = mat?.concluido ? 'concluido' : (mat && progresso > 0) ? 'em-andamento' : 'nao-iniciado';
            const statusLabel = status === 'em-andamento' ? 'Andamento' : status === 'concluido' ? 'Concluído' : 'Não-Iniciado';
            const statusClass = status === 'em-andamento' ? 'status-em-andamento' : status === 'concluido' ? 'status-concluido' : 'status-nao-iniciado';
            const thumbSrc = c.thumbnail_url || '';
            return (
              <div key={c.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  <img src={thumbSrc} alt={c.titulo} loading="lazy" />
                  <span className={`curso-card__status ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="curso-card__name">{c.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__meta">
                  <span><i className="fa-solid fa-book"></i> Curso</span>
                  <span><i className="fa-solid fa-award"></i> Certificado</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}