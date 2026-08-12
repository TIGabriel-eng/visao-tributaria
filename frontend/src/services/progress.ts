import { AuthService } from './auth';
import { ApiService } from './api';

const STORAGE_KEY = 'orcoma_progresso';
const SYNC_DEBOUNCE_MS = 1500;

interface SyncEntry {
  timer: ReturnType<typeof setTimeout>;
}

const pendingSync = new Map<number, SyncEntry>();

function userKey(): string {
  const email = AuthService.getEmail() || AuthService.getName() || 'guest';
  return 'user_' + email.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function lerStorage(): any {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function escreverStorage(storage: any): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {}
}

function lerUsuario(storage: any): any {
  const userData = storage.users?.[userKey()];
  if (!userData) return { cursos: {}, ultima_atualizacao: null };
  if (!userData.cursos) userData.cursos = {};
  return userData;
}

function candidatosId(cursoId: number | string, slug?: string): string[] {
  const keys = new Set<string>();
  if (cursoId !== undefined && cursoId !== null) keys.add(String(cursoId));
  if (slug) {
    keys.add(slug);
    keys.add('slug_' + slug);
  }
  return Array.from(keys);
}

function lerLocal(cursoId: number | string, slug?: string): any | null {
  const storage = lerStorage();
  const userData = lerUsuario(storage);
  const candidatos = candidatosId(cursoId, slug);
  let merged: any = null;
  for (const key of candidatos) {
    const entrada = userData.cursos[key];
    if (entrada) {
      merged = merged ? mergeProgress(merged, entrada) : entrada;
    }
  }
  return merged;
}

function escreverLocal(cursoId: number | string, slug: string | undefined, dados: any): void {
  const storage = lerStorage();
  const userData = lerUsuario(storage);
  if (!storage.users) storage.users = {};
  storage.users[userKey()] = userData;
  const candidatos = candidatosId(cursoId, slug);
  for (const key of candidatos) {
    userData.cursos[key] = dados;
  }
  userData.ultima_atualizacao = new Date().toISOString();
  storage.cursos = userData.cursos;
  storage.ultima_atualizacao = userData.ultima_atualizacao;
  escreverStorage(storage);
}

function mergeProgress(a: any, b: any): any {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const aAulas = Array.isArray(a.aulas_concluidas) ? a.aulas_concluidas : [];
  const bAulas = Array.isArray(b.aulas_concluidas) ? b.aulas_concluidas : [];
  const aulas = Array.from(new Set([...aAulas, ...bAulas]));
  const concluido = !!(a.concluido || b.concluido);
  const aPct = Number(a.progresso) || 0;
  const bPct = Number(b.progresso) || 0;
  const pctAulas = aulas.length > 0 ? Math.max(aPct, bPct) : 0;
  return {
    concluido,
    concluido_em: a.concluido_em || b.concluido_em || null,
    progresso: concluido ? 100 : Math.max(aPct, bPct, pctAulas),
    aulas_concluidas: aulas,
    ultimo_video_assistido: a.ultimo_video_assistido || b.ultimo_video_assistido || a.ultima_aula || b.ultima_aula || null,
    ultima_aula: a.ultima_aula || b.ultima_aula || a.ultimo_video_assistido || b.ultimo_video_assistido || null,
    ultimo_segundo_assistido: Math.max(Number(a.ultimo_segundo_assistido) || 0, Number(b.ultimo_segundo_assistido) || 0),
    ultima_atualizacao: new Date().toISOString(),
  };
}

function normalizarServidor(data: any): any | null {
  if (!data) return null;
  const progresso = Number(data.progresso) || 0;
  return {
    concluido: !!data.concluido,
    concluido_em: data.concluido_em || null,
    progresso,
    aulas_concluidas: Array.isArray(data.aulas_concluidas) ? data.aulas_concluidas : [],
    ultimo_video_assistido: data.ultima_aula && typeof data.ultima_aula === 'object' ? data.ultima_aula : null,
    ultima_aula: data.ultima_aula && typeof data.ultima_aula === 'object' ? data.ultima_aula : null,
    ultimo_segundo_assistido: Number(data.ultimo_segundo_assistido) || 0,
  };
}

async function lerServidor(cursoId: number | string): Promise<any | null> {
  try {
    const data = await ApiService.getStatusMatricula(cursoId);
    return normalizarServidor(data);
  } catch {
    return null;
  }
}

async function enviarServidor(cursoId: number, dados: any): Promise<void> {
  try {
    await ApiService.atualizarProgresso(cursoId, {
      progresso: dados.progresso || 0,
      aulas_concluidas: Array.isArray(dados.aulas_concluidas) ? dados.aulas_concluidas : [],
      ultima_aula: dados.ultima_aula || dados.ultimo_video_assistido || null,
      concluido: !!dados.concluido,
      ultimo_segundo_assistido: Number(dados.ultimo_segundo_assistido) || 0,
    });
    ApiService.invalidate('/api/matriculas/');
  } catch {}
}

export const ProgressService = {
  lerLocal,

  async getProgresso(cursoId: number | string, slug?: string): Promise<any | null> {
    const local = lerLocal(cursoId, slug);
    let servidor: any | null = null;
    if (AuthService.isLoggedIn()) {
      servidor = await lerServidor(cursoId);
    }
    const merged = mergeProgress(local, servidor);
    if (merged) escreverLocal(cursoId, slug, merged);
    return merged;
  },

  salvarProgresso(cursoId: number | string, slug: string | undefined, dados: any): void {
    if (cursoId === undefined || cursoId === null) return;
    const atual = lerLocal(cursoId, slug);
    const merged = mergeProgress(atual, dados);
    escreverLocal(cursoId, slug, merged);

    if (!AuthService.isLoggedIn()) return;
    const id = Number(cursoId);
    if (!Number.isFinite(id)) return;

    const pendente = pendingSync.get(id);
    if (pendente) clearTimeout(pendente.timer);

    pendingSync.set(id, {
      timer: setTimeout(() => {
        pendingSync.delete(id);
        enviarServidor(id, lerLocal(id, slug) || merged);
      }, SYNC_DEBOUNCE_MS),
    });
  },

  async getMapProgressos(cursos: Array<{ id: number; slug?: string }>): Promise<Record<string, any>> {
    const mapa: Record<string, any> = {};

    if (AuthService.isLoggedIn()) {
      try {
        const matriculas = await ApiService.getMinhasMatriculas();
        (matriculas || []).forEach((m: any) => {
          mapa[String(m.curso)] = {
            concluido: !!m.concluido,
            concluido_em: m.concluido_em || null,
            progresso: Number(m.progresso) || 0,
            aulas_concluidas: Array.isArray(m.aulas_concluidas) ? m.aulas_concluidas : [],
            ultima_aula: m.ultima_aula || null,
            ultimo_video_assistido: m.ultima_aula || null,
            ultimo_segundo_assistido: Number(m.ultimo_segundo_assistido) || 0,
          };
        });
      } catch {}
    }

    cursos.forEach((c) => {
      const local = lerLocal(c.id, c.slug);
      if (!local) return;
      const chave = String(c.id);
      mapa[chave] = mergeProgress(local, mapa[chave]);
    });

    return mapa;
  },
};
