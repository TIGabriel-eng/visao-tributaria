import { AuthService } from './auth';

declare const API: any;

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://dashboard-visao.onrender.com');

const CACHE_TTL = 5 * 60 * 1000;
const CACHEABLE_PATHS = [
  '/api/cursos/',
  '/api/cursos-recomendados/',
  '/api/trilhas/',
  '/api/eventos/',
  '/api/dashboard/',
  '/api/user-stats/',
  '/api/metas-semanais/',
  '/api/matriculas/minhas/',
  '/api/notificacoes/',
];
const responseCache = new Map<string, { data: any; expires: number }>();

function cacheKey(method: string, path: string): string {
  const user = AuthService.getEmail() || AuthService.getName() || 'anon';
  return method + ' ' + path + ' | ' + user;
}

function isCacheable(method: string, path: string): boolean {
  if (method !== 'GET') return false;
  const base = path.split('?')[0];
  return CACHEABLE_PATHS.includes(base);
}

function setCache(method: string, path: string, data: any) {
  if (!isCacheable(method, path)) return;
  responseCache.set(cacheKey(method, path), { data, expires: Date.now() + CACHE_TTL });
}

function getCache(method: string, path: string): any | undefined {
  if (!isCacheable(method, path)) return undefined;
  const key = cacheKey(method, path);
  const hit = responseCache.get(key);
  if (!hit) return undefined;
  if (Date.now() < hit.expires) return hit.data;
  responseCache.delete(key);
  return undefined;
}

function invalidateCache(path: string) {
  const base = path.split('?')[0];
  for (const key of Array.from(responseCache.keys())) {
    if (key.includes(base)) responseCache.delete(key);
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: any) => void }> = [];

function processQueue(error: any) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

async function refreshAccessToken(): Promise<void> {
  const res = await fetch(BASE_URL + '/api/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Refresh failed');
}

function forceLogout() {
  AuthService.logout();
  window.location.href = '/login';
}

async function request(method: string, path: string, body?: any, _retry = false): Promise<any> {
  if (typeof API !== 'undefined') {
    if (body !== undefined) {
      return API[method.toLowerCase()]?.(path, body) ?? API.get?.(path);
    }
    return API[method.toLowerCase()]?.(path) ?? API.get?.(path);
  }

  const url = BASE_URL + path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const options: RequestInit = { method, headers, credentials: 'include' as RequestCredentials };
  if (body !== undefined) options.body = JSON.stringify(body);

  const cached = getCache(method, path);
  if (cached !== undefined) return cached;

  const res = await fetch(url, options);

  const isLoginPath = path === '/api/token/';
  if (res.status === 401 && !_retry && !isLoginPath) {
    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => fetch(url, options).then(r => r.json()));
    }

    isRefreshing = true;
    try {
      await refreshAccessToken();
      processQueue(null);
      const retryRes = await fetch(url, options);
      let retryData;
      try { retryData = await retryRes.json(); } catch { retryData = null; }
      if (!retryRes.ok) {
        const err = new Error(retryData?.detail || 'Erro na requisição');
        (err as any).status = retryRes.status;
        (err as any).data = retryData;
        throw err;
      }
      setCache(method, path, retryData);
      return retryData;
    } catch (err) {
      processQueue(err);
      forceLogout();
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err = new Error(data?.detail || 'Erro na requisição');
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  if (method === 'GET') setCache(method, path, data);
  else invalidateCache(path);
  return data;
}

export const ApiService = {
  BASE_URL,

  get(path: string) {
    return request('GET', path);
  },

  post(path: string, body?: any) {
    return request('POST', path, body);
  },

  patch(path: string, body?: any) {
    return request('PATCH', path, body);
  },

  put(path: string, body?: any) {
    return request('PUT', path, body);
  },

  del(path: string) {
    return request('DELETE', path);
  },

  async logout() {
    if (typeof API !== 'undefined' && API.logout) {
      return API.logout();
    }
    try {
      await fetch(BASE_URL + '/api/logout/', { method: 'POST', credentials: 'include' });
    } catch {}
    AuthService.logout();
  },

  // Dashboard
  async getDashboard() {
    return this.get('/api/dashboard/');
  },

  // Cursos
  async getCursos() {
    return this.get('/api/cursos/');
  },

  async getCursosRecomendados() {
    return this.get('/api/cursos-recomendados/');
  },

  // Matriculas
  async getMinhasMatriculas() {
    return this.get('/api/matriculas/minhas/');
  },

  // Eventos
  async getEventos() {
    return this.get('/api/eventos/');
  },

  async getProximoEvento() {
    return this.get('/api/eventos/proximo/');
  },

  async marcarEventoLido(id: number) {
    return this.post('/api/eventos/' + id + '/marcar-lida/');
  },

  // Trilhas
  async getTrilhas() {
    return this.get('/api/trilhas/');
  },

  // Ambientes
  async getAmbientes() {
    return this.get('/api/ambientes/');
  },

  async getTrilha(id: number | string) {
    return this.get('/api/trilhas/' + id + '/');
  },

  // Perfil
  async getMe() {
    return this.get('/api/me/');
  },

  async patchMe(data: any) {
    return this.patch('/api/me/', data);
  },

  async uploadAvatar(file: File) {
    const url = BASE_URL + '/api/avatar/';
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(url, { method: 'POST', body: formData, credentials: 'include' });
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) throw new Error(data?.detail || data?.error || 'Erro ao enviar avatar');
    return data;
  },

  // Formações
  async getFormacoes() {
    return this.get('/api/formacoes/');
  },

  async postFormacao(dados: any) {
    return this.post('/api/formacoes/', dados);
  },

  async patchFormacao(id: number, dados: any) {
    return this.patch('/api/formacoes/' + id + '/', dados);
  },

  async delFormacao(id: number) {
    return this.del('/api/formacoes/' + id + '/');
  },

  // Habilidades
  async getHabilidades() {
    return this.get('/api/habilidades/');
  },

  async postHabilidade(dados: any) {
    return this.post('/api/habilidades/', dados);
  },

  async delHabilidade(id: number) {
    return this.del('/api/habilidades/' + id + '/');
  },

  // Curso Módulos
  async getCursoModulos(slug: string) {
    return this.get('/api/cursos/' + slug + '/modulos/');
  },

  // Avaliações / Reviews
  async getAvaliacoes(moduloId: number | string) {
    return this.get('/api/modulos/' + moduloId + '/avaliacoes/');
  },

  async postAvaliacao(moduloId: number | string, data: { modulo?: number | string; nota: number; comentario: string }) {
    return this.post('/api/modulos/' + moduloId + '/avaliacoes/', data);
  },

  // Matrícula - posição do vídeo
  async salvarPosicao(cursoId: number, videoId: number | null, segundo: number) {
    return this.post('/api/matriculas/salvar-posicao/', { curso: cursoId, video_id: videoId, segundo });
  },

  async getPosicao(cursoId: number) {
    return this.get('/api/matriculas/posicao/?curso=' + cursoId);
  },

  async getStatusMatricula(cursoId: number | string) {
    return this.get('/api/matriculas/status/?curso=' + cursoId);
  },

  async atualizarProgresso(cursoId: number, dados: any) {
    return this.post('/api/matriculas/atualizar-progresso/', { curso: cursoId, ...dados });
  },

  async concluirCurso(cursoId: number) {
    return this.post('/api/matriculas/concluir/', { curso: cursoId });
  },

  async resolveOnedriveUrl(url: string) {
    return this.get('/api/onedrive/embed-url/?url=' + encodeURIComponent(url));
  },

  invalidate(pathPrefix: string) {
    invalidateCache(pathPrefix);
  },

  // User Stats
  async getUserStats(academia?: string) {
    let url = '/api/user-stats/';
    if (academia) url += '?academia=' + encodeURIComponent(academia);
    return this.get(url);
  },

  // Metas Semanais
  async getMetasSemanais() {
    return this.get('/api/metas-semanais/');
  },

  async postMetaSemanal(dados: any) {
    return this.post('/api/metas-semanais/', dados);
  },

  // Notificações
  async getNotificacoes() {
    return this.get('/api/notificacoes/');
  },

  async getNotificacoesNaoLidasCount() {
    return this.get('/api/notificacoes/nao-lidas/count/');
  },

  async marcarNotificacaoLida(id: number) {
    return this.post('/api/notificacoes/marcar-lida/', { id });
  },

  async marcarTodasNotificacoesLidas() {
    return this.post('/api/notificacoes/marcar-todas-lidas/');
  },

  async criarLembreteEventos() {
    return this.post('/api/notificacoes/criar-lembrete-eventos/');
  },
};