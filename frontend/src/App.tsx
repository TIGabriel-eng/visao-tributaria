import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthService } from './services/auth';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AmbientePage } from './pages/AmbientePage';
import { LoginPage } from './pages/LoginPage';
import { MeusCursosPage } from './pages/MeusCursosPage';
import { EventosPage } from './pages/EventosPage';
import { ContinuarAssistindoPage } from './pages/ContinuarAssistindoPage';
import { CursosConcluidosPage } from './pages/CursosConcluidosPage';
import { TrilhasPage } from './pages/TrilhasPage';
import { TrilhaDetalhePage } from './pages/TrilhaDetalhePage';
import { CursoPage } from './pages/CursoPage';
import { SuportePage } from './pages/SuportePage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { MeuPerfilPage } from './pages/MeuPerfilPage';
import { CertificadosPage } from './pages/CertificadosPage';
import { NotificacoesPage } from './pages/NotificacoesPage';
import { VideoAreaPage } from './pages/VideoAreaPage';
import { CookieConsent } from './components/CookieConsent';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = AuthService.isLoggedIn();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function getRoleAcademies(role: string): 'business' | 'team' | 'all' {
  if (role === 'cliente_orcoma' || role === 'empresario') return 'business';
  if (role === 'cliente_equipe' || role === 'colaborador_orcoma') return 'team';
  return 'all';
}

function RoleGate({ children }: { children: React.ReactNode }) {
  const role = AuthService.getRole();
  const allowed = getRoleAcademies(role);
  const location = useLocation();

  const businessPaths = ['/business', '/contabil', '/empresarial'];
  const teamPaths = ['/team', '/time', '/orcomakers'];

  const onBusinessPath = businessPaths.some(p => location.pathname.startsWith(p));
  const onTeamPath = teamPaths.some(p => location.pathname.startsWith(p));

  if (allowed === 'business' && onTeamPath) return <Navigate to="/business" replace />;
  if (allowed === 'team' && onBusinessPath) return <Navigate to="/team" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/video-area/:cursoSlug" element={
          <ProtectedRoute>
            <VideoAreaPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <RoleGate>
              <Layout />
            </RoleGate>
          </ProtectedRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="team" element={<HomePage />} />
          <Route path="business" element={<HomePage />} />
          <Route path="meus-cursos" element={<MeusCursosPage />} />
          <Route path="eventos" element={<EventosPage />} />
          <Route path="continuar-assistindo" element={<ContinuarAssistindoPage />} />
          <Route path="cursos-concluidos" element={<CursosConcluidosPage />} />
          <Route path="trilhas" element={<TrilhasPage />} />
          <Route path="trilhas/:id" element={<TrilhaDetalhePage />} />
          <Route path="curso/:slug" element={<CursoPage />} />
          <Route path="suporte" element={<SuportePage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
          <Route path="meu-perfil" element={<MeuPerfilPage />} />
          <Route path="certificados" element={<CertificadosPage />} />
          <Route path="notificacoes" element={<NotificacoesPage />} />
          <Route path="time" element={<AmbientePage />} />
          <Route path="orcomakers" element={<AmbientePage />} />
          <Route path="contabil" element={<AmbientePage />} />
          <Route path="empresarial" element={<AmbientePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}