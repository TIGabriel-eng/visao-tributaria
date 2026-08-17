import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { NAV_ITEMS, ACADEMIES, MAIN_ACADEMIES } from '../types';
import type { AcademyConfig } from '../types';
import logoImage from '../assets/images/visão-logo.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function getMainAcademy(academyKey: string): AcademyConfig {
  for (const mainKey of MAIN_ACADEMIES) {
    const main = ACADEMIES[mainKey];
    if (main.children?.includes(academyKey)) return main;
  }
  return ACADEMIES[academyKey] || ACADEMIES['Academy Business'];
}

function getRoleAcademies(role: string): string[] {
  if (role === 'cliente_orcoma' || role === 'empresario') return ['Academy Business'];
  if (role === 'cliente_equipe' || role === 'colaborador_orcoma') return ['Academy Team'];
  return MAIN_ACADEMIES;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [envOpen, setEnvOpen] = useState(false);
  const [currentAcademy, setCurrentAcademy] = useState<AcademyConfig>(getMainAcademy(AuthService.getCurrentAcademy()));
  const envRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = location.pathname;
    let academyKey = 'Academy Business';
    if (path.includes('/contabil')) {
      academyKey = 'Academy Contabil';
    } else if (path.includes('/empresarial')) {
      academyKey = 'Academy Empresarial';
    } else if (path.includes('/business')) {
      academyKey = 'Academy Business';
    } else if (path.includes('/time')) {
      academyKey = 'Academy Time';
    } else if (path.includes('/orcomakers')) {
      academyKey = 'Academy Orcomakers';
    } else if (path.includes('/team')) {
      academyKey = 'Academy Team';
    }
    AuthService.setCurrentAcademy(academyKey);
    setCurrentAcademy(getMainAcademy(academyKey));
  }, [location.pathname]);

  const role = AuthService.getRole();
  const allowedAcademies = getRoleAcademies(role);
  const defaultPath = allowedAcademies[0] === 'Academy Business' ? '/business' : '/team';

  const handleNav = useCallback((page: string) => {
    if (page === 'sair') {
      AuthService.logout();
      navigate('/login');
      return;
    }
    const urlMap: Record<string, string> = {
      inicio: defaultPath,
      'meu-perfil': '/meu-perfil',
      cursos: '/meus-cursos',
      eventos: '/eventos',
      notificacoes: '/notificacoes',
      continuar: '/continuar-assistindo',
      concluidos: '/cursos-concluidos',
      certificados: '/certificados',
      trilhas: '/trilhas',
      suporte: '/suporte',
      config: '/configuracoes',
    };
    const url = urlMap[page];
    if (url) navigate(url);
  }, [navigate]);

  const handleEnvChange = (academyKey: string) => {
    AuthService.setCurrentAcademy(academyKey);
    setCurrentAcademy(ACADEMIES[academyKey]);
    setEnvOpen(false);
    navigate(ACADEMIES[academyKey].path);
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} id="sidebar">
        <div className="sidebar__logo">
          <img src={logoImage} alt="Visão Academy" className="sidebar__logo-img" />
        </div>

        <nav className="sidebar__nav">
          <ul>
            {NAV_ITEMS.map((item, idx) => {
              if ('divider' in item) {
                return <li key={idx} className="nav-divider">{item.divider}</li>;
              }
              const navItem = item as typeof NAV_ITEMS[0] & { page: string };
              const isActive = location.pathname === navItem.path || location.pathname.startsWith(navItem.path + '/');
              return (
                <li
                  key={idx}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNav(navItem.page)}
                >
                  <i className={navItem.icon}></i>
                  <span>{navItem.label}</span>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar__env">
          <p className="sidebar__env-label">AMBIENTE ATIVO</p>
          <div className="sidebar__env-selector" onClick={() => setEnvOpen(!envOpen)} ref={envRef}>
            <i className={`fa-solid ${currentAcademy.icon}`}></i>
            <span>{currentAcademy.name}</span>
            <i className={`fa-solid fa-chevron-down ${envOpen ? 'is-open' : ''}`}></i>
          </div>
          <div className={`env-dropdown ${envOpen ? 'is-visible' : ''}`}>
            {allowedAcademies.map((key) => {
              const academy = ACADEMIES[key];
              return (
                <div
                  key={key}
                  className={`env-dropdown__item ${currentAcademy.name === academy.name ? 'active' : ''}`}
                  onClick={() => handleEnvChange(key)}
                >
                  <i className={`fa-solid ${academy.icon}`}></i> {academy.name}
                </div>
              );
            })}
          </div>
        </div>

      </aside>

      {isOpen && <div className="sidebar__overlay is-visible" onClick={onClose} id="sidebarOverlay"></div>}
    </>
  );
}