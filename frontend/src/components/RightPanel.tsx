import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import type { Curso, Evento } from '../types';
import { PLANO_MAP } from '../types';

export function RightPanel() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const academySubPages = ['/time', '/orcomakers', '/contabil', '/empresarial'];
  const showCards = !academySubPages.includes(pathname);
  const [userName, setUserName] = useState(AuthService.getName());
  const [avatar, setAvatar] = useState(AuthService.getAvatar());
  const [role, setRole] = useState(AuthService.getRole());
  const [profileOpen, setProfileOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<Evento[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  useEffect(() => {
    const updateUser = () => {
      setUserName(AuthService.getName());
      setAvatar(AuthService.getAvatar());
      setRole(AuthService.getRole());
    };
    updateUser();
    const interval = setInterval(updateUser, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([ApiService.getCursos(), ApiService.getMinhasMatriculas(), ApiService.getEventos()])
      .then(([cursosData, matriculasData, eventosData]) => {
        setCursos(cursosData || []);
        setMatriculas(matriculasData || []);
        const eventos = (eventosData || []) as Evento[];
        const now = new Date();
        const future = eventos
          .map((e) => {
            const parts = e.data.split(' ');
            if (parts.length < 2) return null;
            const dp = parts[0].split('/');
            const tp = parts[1].split(':');
            if (dp.length < 3 || tp.length < 2) return null;
            const d = new Date(parseInt(dp[2]), parseInt(dp[1]) - 1, parseInt(dp[0]), parseInt(tp[0]), parseInt(tp[1]));
            return d > now ? e : null;
          })
          .filter(Boolean) as Evento[];
        future.sort((a, b) => {
          const da = new Date(a.data.split(' ')[0].split('/').reverse().join('-'));
          const db = new Date(b.data.split(' ')[0].split('/').reverse().join('-'));
          return da.getTime() - db.getTime();
        });
        setEvents(future.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cursos.length) return;
    const total = cursos.length || 1;
    const concluidas = matriculas.filter((m) => m.concluido).length;
    const percent = Math.round((concluidas / total) * 100);
    setProgress(percent);
  }, [cursos, matriculas]);

  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (progress / 100) * circumference;

  const tiers = [
    { max: 10, label: 'Iniciante', color: '#dc2626' },
    { max: 47, label: 'Razoável', color: '#eab308' },
    { max: 99, label: 'Bom', color: '#22c55e' },
    { max: 100, label: 'Excelente', color: '#0073ff' },
  ];
  const tier = tiers.find((t) => progress <= t.max) || tiers[0];

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  const handleLogout = useCallback(() => {
    AuthService.logout();
    navigate('/login');
  }, [navigate]);

  return (
    <aside className="right-panel">
      <div className="progress-profile-bar">
        <div className="progress-profile-bar__trigger" onClick={() => setProfileOpen(!profileOpen)}>
          <img src={avatar || '../assets/images/avatar-icon.jpg'} alt="Avatar" className="progress-sidebar__avatar" id="userAvatar" onError={(e) => { (e.target as HTMLImageElement).src = '../assets/images/avatar-icon.jpg'; }} style={{ width: '57.75px', height: '57.75px', borderRadius: '50%', objectFit: 'cover' }} />
          <div className="progress-sidebar__user-info">
            <span className="progress-sidebar__username">{userName}</span>
            <span className={`progress-sidebar__plan pill-${role === 'admin' ? 'admin' : role === 'empresario' ? 'empresario' : role === 'visitor' ? 'visitor' : role === 'colaborador_orcoma' ? 'colaborador_orcoma' : 'cliente'}`} id="adminPill">
              {PLANO_MAP[role] || 'Visitante'}
            </span>
            {role === 'admin' && (
              <div className="admin-dropdown" id="adminDropdown">
                <a href="https://orcoma-academy-backend.onrender.com/admin/" target="_blank" className="admin-dropdown__item">
                  <i className="fa-solid fa-shield-halved"></i> Painel Administrativo
                </a>
              </div>
            )}
          </div>
          <i className="fa-solid fa-chevron-down progress-sidebar__chevron" id="profileChevron" onClick={() => setProfileOpen(!profileOpen)}></i>
        </div>
        <div className={`profile-dropdown ${profileOpen ? 'is-visible' : ''}`} id="profileDropdown" onClick={(e) => e.stopPropagation()}>
          <a href="/meu-perfil" className="profile-dropdown__item" onClick={() => setProfileOpen(false)}>
            <i className="fa-regular fa-user"></i> Meu Perfil
          </a>
          <a href="/meus-cursos" className="profile-dropdown__item" onClick={() => setProfileOpen(false)}>
            <i className="fa-solid fa-graduation-cap"></i> Meus cursos
          </a>
          <a href="/certificados" className="profile-dropdown__item" onClick={() => setProfileOpen(false)}>
            <i className="fa-solid fa-certificate"></i> Certificados
          </a>
          <div className="profile-dropdown__divider"></div>
          <a href="#" className="profile-dropdown__item profile-dropdown__item--logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
            <i className="fa-solid fa-right-from-bracket"></i> Sair
          </a>
        </div>
      </div>

      {showCards && (
        <>
          <section className="progress-sidebar" id="progressSidebar">
            <div className="progress__header">
              <h3>Seu progresso geral</h3>
            </div>
            <div className="progress__summary">
              <div className="progress__circle-wrap">
                <svg className="progress__ring" viewBox="0 0 120 120">
                  <circle className="progress__ring-bg" cx="60" cy="60" r="50"></circle>
                  <circle className="progress__ring-fill" cx="60" cy="60" r="50" style={{ stroke: tier.color, strokeDasharray: circumference, strokeDashoffset: offset }} id="progressRing"></circle>
                </svg>
                <div className="progress__circle-text">
                  <span className="progress__percent" id="progressPercent">{progress}%</span>
                </div>
              </div>
              <div className="progress__info">
                <span className="progress__label" id="progressLabel">{tier.label}!</span>
                <span className="progress__sub" id="progressSub">
                  {progress <= 10 ? 'Você deu o primeiro passo! Cada aula é uma conquista.' : progress <= 47 ? 'Bom começo! Continue assistindo suas aulas.' : progress <= 99 ? 'Incrível! Você já completou metade dos cursos.' : 'Parabéns! Você completou todos os cursos!'}
                </span>
              </div>
            </div>
          </section>

          <section className="events-sidebar" id="eventsSidebar">
            <div className="events-header">
              <h3>Próximos eventos</h3>
            </div>
            <div className="events-body" id="eventsBody">
              {events.length === 0 ? (
                <div className="events-empty">
                  <i className="ti ti-calendar-off"></i>
                  <p>Nenhum evento agendado</p>
                </div>
              ) : (
                <div className="events-list" id="eventsList">
                  {events.map((ev) => {
                    const parts = ev.data.split(' ');
                    const dp = parts[0]?.split('/') || [];
                    const tp = parts[1]?.split(':') || [];
                    const d = new Date(parseInt(dp[2] || '2024'), parseInt(dp[1] || '1') - 1, parseInt(dp[0] || '1'), parseInt(tp[0] || '0'), parseInt(tp[1] || '0'));
                    const mes = meses[d.getMonth()];
                    const dia = d.getDate();
                    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={ev.id} className="events-list__item" data-evento-id={ev.id}>
                        <div className="events-list__date">
                          <span className="events-list__month">{mes}</span>
                          <span className="events-list__day">{dia}</span>
                        </div>
                        <div className="events-list__info">
                          <div className="events-list__title">{ev.titulo || 'Evento'}</div>
                          <div className="events-list__time">{hora}</div>
                        </div>
                        <i className="ti ti-chevron-right events-list__arrow"></i>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="events-footer">
              <a href="/eventos" className="events-link">
                Ver calendário completo <i className="ti ti-arrow-right"></i>
              </a>
            </div>
          </section>

        </>
      )}
    </aside>
  );
}