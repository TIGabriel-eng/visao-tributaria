export interface User {
  role: string;
  email: string;
  name: string;
  avatar: string;
  plano_nome: string;
}

export interface Curso {
  id: number;
  slug?: string;
  titulo: string;
  descricao?: string;
  thumbnail_url?: string;
  tipo?: string;
  status?: string;
  is_gratuito?: boolean;
  videos?: Video[];
}

export interface Video {
  id: number;
  titulo: string;
  url?: string;
  duracao?: string;
}

export interface Material {
  id: number;
  titulo: string;
  modalidade?: string;
  url_externa?: string;
  arquivo_url?: string;
  tamanho?: string;
}

export interface Modulo {
  id: number;
  titulo: string;
  descricao?: string;
  materiais?: Material[];
}

export interface CursoModulosResponse {
  curso: Curso;
  modulos: Modulo[];
}

export interface Review {
  id?: number;
  nota: number;
  comentario: string;
  usuario_nome?: string;
  usuario_avatar?: string;
  created_at?: string;
}

export interface AulaProgresso {
  concluido: boolean;
  concluido_em?: string;
  progresso: number;
  ultimo_segundo_assistido?: number;
  ultima_atualizacao?: string;
}

export interface Evento {
  id: number;
  titulo?: string;
  data: string;
  imagem_url?: string;
  descricao?: string;
  url?: string;
}

export interface Trilha {
  id: number;
  nome: string;
  descricao?: string;
  ambiente?: number;
  ambiente_nome?: string;
  cursos?: Curso[];
  cursos_count?: number;
}

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'boas_vindas' | 'curso_concluido' | 'evento';
  lida: boolean;
  link: string;
  created_at: string;
}

export interface Matricula {
  id: number;
  curso: number;
  concluido: boolean;
  progresso?: number;
}

export interface DashboardData {
  metricas: {
    cursos_ativos: number;
    total_usuarios: number;
    certificados_emitidos: number;
    satisfacao_alunos: number;
  };
}

export interface ProgressData {
  users: Record<string, {
    cursos: Record<string, { progresso: number; concluido: boolean }>;
    ultima_atualizacao: string | null;
  }>;
}

export interface AcademyConfig {
  name: string;
  icon: string;
  path: string;
  type: 'team' | 'business';
  children?: string[];
}

export interface Ambiente {
  id: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  imagem_url?: string | null;
}
export const ACADEMIES: Record<string, AcademyConfig> = {
  'Academy Team': { name: 'Academy Team', icon: 'fa-users', path: '/team', type: 'team', children: ['Academy Time', 'Academy Orcomakers'] },
  'Academy Business': { name: 'Academy Business', icon: 'fa-building', path: '/business', type: 'business', children: ['Academy Contabil', 'Academy Empresarial'] },
  'Academy Time': { name: 'Academy Time', icon: 'fa-calculator', path: '/time', type: 'team' },
  'Academy Orcomakers': { name: 'Academy Orcomakers', icon: 'fa-chart-line', path: '/orcomakers', type: 'team' },
  'Academy Contabil': { name: 'Academy Contábil', icon: 'fa-calculator', path: '/contabil', type: 'business' },
  'Academy Empresarial': { name: 'Academy Gestão Empresarial', icon: 'fa-building', path: '/empresarial', type: 'business' },
};

export const MAIN_ACADEMIES = ['Academy Team', 'Academy Business'];

export function getChildAcademies(parentKey: string): AcademyConfig[] {
  const parent = ACADEMIES[parentKey];
  if (!parent?.children) return [];
  return parent.children.map((childKey) => ACADEMIES[childKey]).filter(Boolean);
}

export const NAV_ITEMS = [
  { page: 'inicio', icon: 'fa-solid fa-house', label: 'Início', path: '/team' },
  { divider: 'Aprendizado' },
  { page: 'cursos', icon: 'fa-solid fa-book', label: 'Catálogo', path: '/meus-cursos' },
  { page: 'eventos', icon: 'fa-regular fa-calendar', label: 'Eventos', path: '/eventos' },
  { divider: 'Progresso' },
  { page: 'continuar', icon: 'fa-solid fa-play', label: 'Continuar assistindo', path: '/continuar-assistindo' },
  { page: 'concluidos', icon: 'fa-solid fa-circle-check', label: 'Cursos concluídos', path: '/cursos-concluidos' },
  { page: 'trilhas', icon: 'fa-solid fa-route', label: 'Trilhas de aprendizagem', path: '/trilhas' },
  { divider: 'Geral' },
  { page: 'notificacoes', icon: 'fa-regular fa-bell', label: 'Notificações', path: '/notificacoes' },
  { page: 'suporte', icon: 'fa-regular fa-circle-question', label: 'Suporte', path: '/suporte' },
  { page: 'config', icon: 'fa-solid fa-gear', label: 'Configurações', path: '/configuracoes' },
];

export const PLANO_MAP: Record<string, string> = {
  'cliente_premium': 'Cliente Premium ⭐',
  'cliente_orcoma': 'Cliente Orcoma',
  'colaborador_orcoma': 'Orcoma Team',
  'gestor_orcoma': 'Orcoma Business',
  'admin': 'Administrador',
  'empresario': 'Empresário',
  'visitor': 'Visitante',
};