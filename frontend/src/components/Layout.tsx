import { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RightPanel } from './RightPanel';
import { EventoComunicado } from './EventoComunicado';
import type { Curso, Trilha, Evento } from '../types';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('recomendados');
  const [searchResults, setSearchResults] = useState<{ cursos: Curso[]; trilhas: Trilha[]; eventos: Evento[]; recomendados: Curso[] }>({ cursos: [], trilhas: [], eventos: [], recomendados: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFetched, setSearchFetched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const academyRoutes = ['/team', '/business', '/time', '/visioners', '/vex', '/empresarial'];
  const noRightPanelRoutes = ['/time', '/visioners', '/vex', '/empresarial'];
  const showRightPanel = academyRoutes.includes(location.pathname) && !noRightPanelRoutes.includes(location.pathname);
  const showSearch = academyRoutes.includes(location.pathname);
  const showProfileInTopbar = noRightPanelRoutes.includes(location.pathname);

  useEffect(() => {
    if (!AuthService.isLoggedIn()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
      setSearchFetched(false);
      setSearchFilter('recomendados');
      return;
    }
    if (searchFetched) return;
    setSearchLoading(true);
    Promise.all([
      ApiService.getCursos(),
      ApiService.getTrilhas(),
      ApiService.getEventos(),
      ApiService.getCursosRecomendados(),
    ]).then(([cursos, trilhas, eventos, recomendados]) => {
      setSearchResults({
        cursos: cursos || [],
        trilhas: trilhas || [],
        eventos: eventos || [],
        recomendados: recomendados || [],
      });
      setSearchFetched(true);
    }).catch(() => {}).finally(() => setSearchLoading(false));
  }, [searchOpen, searchFetched]);

  const query = searchQuery.toLowerCase().trim();
  const hasQuery = query.length > 0;

  const filtered = useMemo(() => ({
    cursos: hasQuery
      ? searchResults.cursos.filter(c => c.titulo.toLowerCase().includes(query))
      : searchResults.cursos,
    trilhas: hasQuery
      ? searchResults.trilhas.filter(t => (t.nome || '').toLowerCase().includes(query))
      : searchResults.trilhas,
    eventos: hasQuery
      ? searchResults.eventos.filter(e => (e.titulo || '').toLowerCase().includes(query))
      : searchResults.eventos,
    recomendados: hasQuery
      ? searchResults.recomendados.filter(c => c.titulo.toLowerCase().includes(query))
      : searchResults.recomendados,
  }), [searchResults, query, hasQuery]);

  const handleMenuToggle = () => setSidebarOpen(!sidebarOpen);
  const handleSearchOpen = () => { if (showSearch) setSearchOpen(true); };

  const handleResultClick = (type: string, slug?: string) => {
    setSearchOpen(false);
    if (type === 'evento') { navigate('/eventos'); return; }
    if (type === 'trilha') { navigate('/trilhas'); return; }
    if (slug) navigate('/video-area/' + slug);
  };

  const renderSearchCard = (item: { type: string; icon: string; iconBg: string; iconColor: string; title: string; meta: string; slug?: string }) => (
    <div key={item.type + '-' + item.title} className="search-modal__card" onClick={() => handleResultClick(item.type, item.slug)}>
      <div className="search-modal__card-icon" style={{ background: item.iconBg, color: item.iconColor, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={item.icon}></i>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="search-modal__card-title">{item.title}</div>
        <div className="search-modal__card-meta">{item.meta}</div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (searchLoading) {
      return <div className="search-modal__loading"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</div>;
    }

    if (searchFilter === 'eventos') {
      const items = filtered.eventos;
      if (items.length === 0) {
        return <div className="search-modal__empty"><i className="fa-regular fa-calendar-xmark"></i><p>Nenhum evento encontrado</p></div>;
      }
      return items.map(e => renderSearchCard({
        type: 'evento',
        icon: 'fa-regular fa-calendar',
        iconBg: 'rgba(122,82,48,0.12)',
        iconColor: '#7A5230',
        title: e.titulo || 'Evento',
        meta: 'Evento • ' + (e.data || ''),
      }));
    }

    const items: { type: string; icon: string; iconBg: string; iconColor: string; title: string; meta: string; slug?: string }[] = [];

    if (!hasQuery) {
      filtered.recomendados.slice(0, 5).forEach(c => items.push({
        type: 'recomendado',
        icon: 'fa-solid fa-star',
        iconBg: 'rgba(255,157,0,0.12)',
        iconColor: '#ff9d00',
        title: c.titulo,
        meta: 'Recomendado para você',
        slug: c.slug || String(c.id),
      }));
    }

    filtered.cursos.forEach(c => items.push({
      type: 'curso',
      icon: 'fa-solid fa-book',
      iconBg: 'rgba(122,82,48,0.12)',
      iconColor: '#7A5230',
      title: c.titulo,
      meta: 'Curso',
      slug: c.slug || String(c.id),
    }));

    filtered.trilhas.forEach(t => items.push({
      type: 'trilha',
      icon: 'fa-solid fa-route',
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#10b981',
      title: t.nome,
      meta: 'Trilha • ' + (t.cursos?.length || 0) + ' cursos',
    }));

    if (items.length === 0) {
      return <div className="search-modal__empty"><i className="fa-regular fa-magnifying-glass"></i><p>Nenhum resultado para "{searchQuery}"</p></div>;
    }

    return items.map(renderSearchCard);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onMenuToggle={handleMenuToggle} onSearchOpen={handleSearchOpen} showSearch={showSearch} showProfile={showProfileInTopbar} />
        <main className="main-content" id="mainContent" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
      {showRightPanel && <RightPanel />}
      <EventoComunicado />
      {searchOpen && (
        <div className="search-modal-overlay is-visible" onClick={() => setSearchOpen(false)} id="searchModalOverlay">
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal__header">
              <i className="fa-solid fa-magnifying-glass search-modal__icon"></i>
              <span className="search-modal__title">Buscar</span>
            </div>
            <div className="search-modal__subtitle">Encontre cursos, trilhas, eventos e recomendados</div>
            <div className="search-modal__divider"></div>
            <div className="search-modal__input-wrap">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input ref={searchInputRef} type="text" placeholder="Pesquisar..." autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button className="search-modal__clear" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, width: 'auto', height: 'auto', margin: 0 }}><i className="fa-solid fa-xmark"></i></button>}
            </div>
            <div className="search-modal__divider"></div>
            <div className="search-modal__nav">
              <button className={`search-modal__nav-item ${searchFilter === 'recomendados' ? 'is-active' : ''}`} onClick={() => setSearchFilter('recomendados')}>
                <i className="fa-solid fa-star"></i> Recomendados
              </button>
              <button className={`search-modal__nav-item ${searchFilter === 'eventos' ? 'is-active' : ''}`} onClick={() => setSearchFilter('eventos')}>
                <i className="fa-solid fa-calendar-days"></i> Eventos
              </button>
            </div>
            <div className="search-modal__results">
              {renderResults()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}