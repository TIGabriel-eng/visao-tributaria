import { useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/auth';
import { ACADEMIES } from '../../types';
import type { Modulo, Material } from '../../types';
import logoImage from '../../assets/images/visão-logo.png';

interface LessonSidebarProps {
  cursoTitulo: string;
  modulos: Modulo[];
  moduloAtualIdx: number;
  aulaAtualIdx: number;
  onSelectAula: (moduloIdx: number, aulaIdx: number, material: Material) => void;
  progressoGeral?: number;
  completedLessons?: Set<string>;
}

export function LessonSidebar({
  cursoTitulo,
  modulos,
  moduloAtualIdx,
  aulaAtualIdx,
  onSelectAula,
  progressoGeral = 0,
  completedLessons = new Set(),
}: LessonSidebarProps) {
  const navigate = useNavigate();
  const totalAulas = modulos.reduce((acc, m) => acc + (m.materiais?.length || 0), 0);
  const concluidas = completedLessons.size;

  const handleLogoClick = () => {
    const academyKey = AuthService.getCurrentAcademy();
    const academy = ACADEMIES[academyKey];
    navigate(academy?.path || '/team');
  };

  return (
    <aside className="va-sidebar">
      <button className="va-sidebar__logo" onClick={handleLogoClick} aria-label="Voltar para a página inicial">
        <img src={logoImage} alt="Visão Academy" />
      </button>

      <div className="va-sidebar__header">
        <h2 className="va-sidebar__title">{cursoTitulo}</h2>
        <div className="va-sidebar__bar">
          <div className="va-sidebar__bar-fill" style={{ width: progressoGeral + '%' }} />
        </div>
        <div className="va-sidebar__stats">
          <span className="va-sidebar__progress">{progressoGeral}% concluído</span>
          <span> · {concluidas}/{totalAulas} aulas</span>
        </div>
      </div>

      <nav className="va-sidebar__modules" aria-label="Módulos do curso">
        {modulos.map((modulo, mIdx) => (
          <div key={modulo.id} className="va-sidebar__module">
            <div className="va-sidebar__module-label">{modulo.titulo}</div>
            <ul>
              {(modulo.materiais || []).map((material, aIdx) => {
                const lessonKey = mIdx + '-' + aIdx;
                const isCurrent = mIdx === moduloAtualIdx && aIdx === aulaAtualIdx;
                const isCompleted = completedLessons.has(lessonKey);
                const isLocked = mIdx > moduloAtualIdx + 1;

                return (
                  <li key={material.id}>
                    <button
                      className={
                        'va-sidebar__lesson' +
                        (isCurrent ? ' active' : '') +
                        (isCompleted ? ' completed' : '') +
                        (isLocked ? ' locked' : '')
                      }
                      onClick={() => !isLocked && onSelectAula(mIdx, aIdx, material)}
                      disabled={isLocked}
                      aria-current={isCurrent ? 'true' : undefined}
                      aria-label={
                        material.titulo +
                        (isCompleted ? ' - Concluída' : isCurrent ? ' - Em andamento' : '')
                      }
                    >
                      <span className="va-sidebar__lesson-icon">
                        {isCompleted ? (
                          <span className="va-check-circle done">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                              <circle cx="8" cy="8" r="7" fill="#10b981" />
                              <path d="M5 8l2 2 4-4" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        ) : isCurrent ? (
                          <i className="fa-solid fa-circle-play" />
                        ) : isLocked ? (
                          <i className="fa-solid fa-lock" />
                        ) : (
                          <span className="va-check-circle">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                              <circle cx="8" cy="8" r="7" stroke="#6b7280" strokeWidth="1.2" fill="none" />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span className="va-sidebar__lesson-title">{material.titulo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
