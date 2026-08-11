import { useEffect, useState } from 'react';
import { AuthService } from '../services/auth';
import { PLANO_MAP } from '../types';
import { ApiService } from '../services/api';
import { NotificationPanel } from './NotificationPanel';

interface TopbarProps {
  onMenuToggle: () => void;
  onSearchOpen: () => void;
  showSearch: boolean;
  showProfile: boolean;
}

export function Topbar({ onMenuToggle, onSearchOpen, showSearch, showProfile }: TopbarProps) {
  const [theme] = useState(localStorage.getItem('theme') || 'dark');
  const [userName, setUserName] = useState(AuthService.getName());
  const [avatar, setAvatar] = useState(AuthService.getAvatar());
  const [role, setRole] = useState(AuthService.getRole());
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUserName(AuthService.getName());
      setAvatar(AuthService.getAvatar());
      setRole(AuthService.getRole());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      ApiService.getNotificacoesNaoLidasCount()
        .then((data) => setNotifCount(data?.count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notifOpen) {
      ApiService.criarLembreteEventos().catch(() => {});
    }
  }, [notifOpen]);

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onMenuToggle} aria-label="Abrir menu">
        <i className="fa-solid fa-bars"></i>
      </button>

      {showSearch && (
        <div className="topbar__search" onClick={onSearchOpen} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Buscar cursos, trilhas ou conteúdos..." readOnly tabIndex={-1} />
          <kbd>Ctrl K</kbd>
        </div>
      )}

      <div className="topbar__actions">
        <div style={{ position: 'relative' }}>
          <button className="topbar__icon-btn" aria-label="Notificações" onClick={() => setNotifOpen(!notifOpen)}>
            <i className="fa-regular fa-bell"></i>
            {notifCount > 0 && <span className="topbar__notif-dot" style={{ display: 'flex' }}></span>}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Perfil mobile — aparece quando RightPanel some (telas ≤1023px) */}
        <div className="topbar-profile topbar-profile--mobile" style={{ position: 'relative' }}>
          <div className="topbar-profile__trigger" onClick={() => setProfileOpen(!profileOpen)}>
            <img src={avatar || '../assets/images/avatar-icon.jpg'} alt="Avatar" className="topbar-profile__avatar" onError={(e) => { (e.target as HTMLImageElement).src = '../assets/images/avatar-icon.jpg'; }} />
          </div>
          {profileOpen && (
            <div className="profile-dropdown is-visible" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
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
          )}
        </div>

        {/* Perfil desktop — só nas rotas sem RightPanel */}
        {showProfile && (
          <div className="topbar-profile topbar-profile--desktop" style={{ position: 'relative' }}>
            <div className="topbar-profile__trigger" onClick={() => setProfileOpen(!profileOpen)}>
              <img src={avatar || '../assets/images/avatar-icon.jpg'} alt="Avatar" className="topbar-profile__avatar" onError={(e) => { (e.target as HTMLImageElement).src = '../assets/images/avatar-icon.jpg'; }} />
              <div className="topbar-profile__details">
                <span className="progress-sidebar__username">{userName}</span>
                <span className={`progress-sidebar__plan pill-${role === 'admin' ? 'admin' : role === 'empresario' ? 'empresario' : role === 'visitor' ? 'visitor' : role === 'colaborador_orcoma' ? 'colaborador_orcoma' : 'cliente'}`}>
                  {PLANO_MAP[role] || 'Visitante'}
                </span>
              </div>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.924rem', color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }}></i>
            </div>
            {profileOpen && (
              <div className="profile-dropdown is-visible" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
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
            )}
          </div>
        )}
      </div>
    </header>
  );
}
