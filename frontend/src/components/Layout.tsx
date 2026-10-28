import { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RightPanel } from './RightPanel';
import { EventoComunicado } from './EventoComunicado';
import { SearchIcon } from './SearchIcons';
import type { SearchIconName } from './SearchIcons';
import type { Curso, Trilha, Evento } from '../types';

interface SearchCardItem {
  type: string;
  icon: SearchIconName;
  title: string;
  meta: string;
  slug?: string;
}

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

  const renderSearchCard = (item: SearchCardItem) => (
    <div key={item.type + '-' + item.title} className="search-modal__card" onClick={() => handleResultClick(item.type, item.slug)}>
      <div className={`search-modal__card-icon search-modal__card-icon--${item.type}`}>
        <SearchIcon name={item.icon} size={18} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="search-modal__card-title">{item.title}</div>
        <div className="search-modal__card-meta">{item.meta}</div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (searchLoading) {
      return <div className="search-modal__loading"><SearchIcon name="spinner" size={20} /> Carregando...</div>;
    }

    if (searchFilter === 'eventos') {
      const items = filtered.eventos;
      if (items.length === 0) {
        return <div className="search-modal__empty"><SearchIcon name="calendar-x" size={28} /><p>Nenhum evento encontrado</p></div>;
      }
      return items.map(e => renderSearchCard({
        type: 'evento',
        icon: 'calendar',
        title: e.titulo || 'Evento',
        meta: 'Evento • ' + (e.data || ''),
      }));
    }

    const items: SearchCardItem[] = [];

    if (!hasQuery) {
      filtered.recomendados.slice(0, 5).forEach(c => items.push({
        type: 'recomendado',
        icon: 'star',
        title: c.titulo,
        meta: 'Recomendado para você',
        slug: c.slug || String(c.id),
      }));
    }

    filtered.cursos.forEach(c => items.push({
      type: 'curso',
      icon: 'book',
      title: c.titulo,
      meta: 'Curso',
      slug: c.slug || String(c.id),
    }));

    filtered.trilhas.forEach(t => items.push({
      type: 'trilha',
      icon: 'route',
      title: t.nome,
      meta: 'Trilha • ' + (t.cursos?.length || 0) + ' cursos',
    }));

    if (items.length === 0) {
      return <div className="search-modal__empty"><SearchIcon name="search" size={28} /><p>Nenhum resultado para "{searchQuery}"</p></div>;
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
              <span className="search-modal__icon"><SearchIcon name="search" size={20} /></span>
              <span className="search-modal__title">Buscar</span>
            </div>
            <div className="search-modal__subtitle">Encontre cursos, trilhas, eventos e recomendados</div>
            <div className="search-modal__divider"></div>
            <div className="search-modal__input-wrap">
              <span className="search-modal__input-icon"><SearchIcon name="search" size={18} /></span>
              <input ref={searchInputRef} type="text" placeholder="Pesquisar..." autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button className="search-modal__clear" onClick={() => setSearchQuery('')} aria-label="Limpar busca"><SearchIcon name="x" size={16} /></button>}
            </div>
            <div className="search-modal__divider"></div>
            <div className="search-modal__nav">
              <button className={`search-modal__nav-item ${searchFilter === 'recomendados' ? 'is-active' : ''}`} onClick={() => setSearchFilter('recomendados')}>
                <SearchIcon name="star" size={14} /> Recomendados
              </button>
              <button className={`search-modal__nav-item ${searchFilter === 'eventos' ? 'is-active' : ''}`} onClick={() => setSearchFilter('eventos')}>
                <SearchIcon name="calendar" size={14} /> Eventos
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
