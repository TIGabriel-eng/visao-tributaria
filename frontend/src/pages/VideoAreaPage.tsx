import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import { ProgressService } from '../services/progress';
import { VideoPlayer } from '../components/video-area/VideoPlayer';
import { LessonInfo } from '../components/video-area/LessonInfo';
import { MaterialsList } from '../components/video-area/MaterialsList';
import { RatingSystem } from '../components/video-area/RatingSystem';
import { LessonSidebar } from '../components/video-area/LessonSidebar';
import { MobileTabs } from '../components/video-area/MobileTabs';
import { ProgressTracker } from '../components/video-area/ProgressTracker';
import type { Curso, Modulo, Material, Review } from '../types';

interface ActiveLesson {
  moduloIdx: number;
  aulaIdx: number;
  material: Material;
  modulo: Modulo;
}

function isPlayableMaterial(m: Material): boolean {
  return !!(m.url_externa || (m.arquivo_url && (!m.modalidade || m.modalidade === 'video')));
}

export function VideoAreaPage() {
  const { cursoSlug } = useParams<{ cursoSlug: string }>();
  const navigate = useNavigate();

  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [showCourseCompleteModal, setShowCourseCompleteModal] = useState(false);
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [mobileTab, setMobileTab] = useState('video');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('materiais');

  const cursoJaConcluidoRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salvarProgressoLocalStorage = useCallback((dados: any) => {
    if (!cursoSlug) return;
    ProgressService.salvarProgresso(curso?.id ?? cursoSlug, cursoSlug, dados);
  }, [curso?.id, cursoSlug]);

  const showToastMsg = useCallback((message: string, duration: number = 5000) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, duration);
  }, []);

  const findNextLesson = useCallback((): { moduloIdx: number; aulaIdx: number; material: Material; modulo: Modulo } | null => {
    if (!activeLesson || !modulos.length) return null;

    let found = false;
    for (let m = 0; m < modulos.length; m++) {
      const aulas = modulos[m].materiais || [];
      for (let a = 0; a < aulas.length; a++) {
        if (m === activeLesson.moduloIdx && a === activeLesson.aulaIdx) {
          found = true;
          continue;
        }
        if (found && isPlayableMaterial(aulas[a])) {
          return { moduloIdx: m, aulaIdx: a, material: aulas[a], modulo: modulos[m] };
        }
      }
    }
    return null;
  }, [activeLesson, modulos]);

  const avancarParaProximaAula = useCallback(() => {
    const next = findNextLesson();
    if (next) {
      setActiveLesson({
        moduloIdx: next.moduloIdx,
        aulaIdx: next.aulaIdx,
        material: next.material,
        modulo: next.modulo,
      });
      setMobileTab('video');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowCourseCompleteModal(true);
    }
  }, [findNextLesson]);

  const marcarAulaComoConcluida = useCallback((moduloIdx: number, aulaIdx: number) => {
    const key = moduloIdx + '-' + aulaIdx;

    if (completedLessons.has(key)) return;

    const nextCompleted = new Set(completedLessons);
    nextCompleted.add(key);
    setCompletedLessons(nextCompleted);

    const totalLessons = modulos.reduce(
      (acc, m) => acc + (m.materiais?.filter(isPlayableMaterial).length || 0), 0
    );
    const newCount = nextCompleted.size;
    const isComplete = totalLessons > 0 && newCount >= totalLessons;
    const pct = totalLessons > 0 ? Math.round((newCount / totalLessons) * 100) : 0;

    const allKeys: string[] = [];
    for (let m = 0; m < modulos.length; m++) {
      const aulas = modulos[m].materiais || [];
      for (let a = 0; a < aulas.length; a++) {
        if (isPlayableMaterial(aulas[a])) {
          allKeys.push(m + '-' + a);
        }
      }
    }
    const aulasConcluidas = isComplete ? allKeys : [...nextCompleted];

    const dados = {
      concluido: isComplete,
      concluido_em: isComplete ? new Date().toISOString() : null,
      progresso: pct,
      aulas_concluidas: aulasConcluidas,
      ultimo_video_assistido: activeLesson ? { moduloIdx: activeLesson.moduloIdx, aulaIdx: activeLesson.aulaIdx } : null,
    };
    salvarProgressoLocalStorage(dados);

    showToastMsg('Etapa Concluída!', 5000);

    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
    }
    advanceTimeoutRef.current = setTimeout(() => {
      avancarParaProximaAula();
    }, 5000);

    if (isComplete && !cursoJaConcluidoRef.current) {
      cursoJaConcluidoRef.current = true;
      if (curso?.id) {
        ApiService.concluirCurso(curso.id).catch((err) => {
          console.error('Erro ao concluir curso:', err);
        });
      }
    }
  }, [modulos, completedLessons, salvarProgressoLocalStorage, showToastMsg, avancarParaProximaAula, activeLesson, curso]);

  // Recalcular progresso quando completedLessons mudar
  useEffect(() => {
    const totalLessons = modulos.reduce(
      (acc, m) => acc + (m.materiais?.filter(isPlayableMaterial).length || 0), 0
    );
    if (totalLessons > 0) {
      const pct = Math.round((completedLessons.size / totalLessons) * 100);
      setProgressoGeral(pct);
    }
  }, [completedLessons, modulos]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!cursoSlug) return;
    setLoading(true);
    setError(null);

    ApiService.getCursoModulos(cursoSlug)
      .then(async (data: any) => {
        const cursoData = data.curso;
        const modulosData: Modulo[] = data.modulos || [];

        if (!cursoData) {
          setError('Curso não encontrado.');
          setLoading(false);
          return;
        }

        setCurso(cursoData);
        setModulos(modulosData);
        document.title = cursoData.titulo + ' | Orcoma Academy';

        const progress = await ProgressService.getProgresso(cursoData.id, cursoSlug);
        if (progress?.concluido) {
          cursoJaConcluidoRef.current = true;
        }

        if (progress?.aulas_concluidas?.length) {
          setCompletedLessons(new Set(progress.aulas_concluidas));
          setProgressoGeral(progress.progresso || 0);
        } else if (progress?.concluido) {
          const allKeys: string[] = [];
          for (let m = 0; m < modulosData.length; m++) {
            const aulas = modulosData[m].materiais || [];
            for (let a = 0; a < aulas.length; a++) {
              allKeys.push(m + '-' + a);
            }
          }
          setCompletedLessons(new Set(allKeys));
          setProgressoGeral(100);
        }

        let startLesson: ActiveLesson | null = null;
        if (progress?.ultimo_video_assistido) {
          const { moduloIdx: mi, aulaIdx: ai } = progress.ultimo_video_assistido;
          if (modulosData[mi] && (modulosData[mi].materiais || [])[ai]) {
            const mat = (modulosData[mi].materiais || [])[ai];
            if (isPlayableMaterial(mat)) {
              startLesson = { moduloIdx: mi, aulaIdx: ai, material: mat, modulo: modulosData[mi] };
            }
          }
        }
        if (!startLesson) {
          for (let m = 0; m < modulosData.length; m++) {
            const aulas = modulosData[m].materiais || [];
            for (let a = 0; a < aulas.length; a++) {
              if (isPlayableMaterial(aulas[a])) {
                startLesson = { moduloIdx: m, aulaIdx: a, material: aulas[a], modulo: modulosData[m] };
                break;
              }
            }
            if (startLesson) break;
          }
        }

        if (startLesson) {
          setActiveLesson(startLesson);
        }

              setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Erro ao carregar curso');
        setLoading(false);
      });
  }, [cursoSlug]);

  useEffect(() => {
    if (!activeLesson || !curso) return;

    if (curso.slug || curso.id) {
      const moduloId = activeLesson.modulo?.id;
      if (moduloId) {
        ApiService.getAvaliacoes(moduloId).then((data: any) => {
          setReviews(data?.results || data || []);
        }).catch(() => setReviews([]));
      }
    }
  }, [activeLesson, curso]);

  const handleSelectAula = useCallback((moduloIdx: number, aulaIdx: number, material: Material) => {
    if (!modulos[moduloIdx]) return;
    setActiveLesson({
      moduloIdx,
      aulaIdx,
      material,
      modulo: modulos[moduloIdx],
    });
    setMobileTab('video');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [modulos]);

  const handleVideoEnded = useCallback(() => {
    if (!activeLesson) return;
    marcarAulaComoConcluida(activeLesson.moduloIdx, activeLesson.aulaIdx);
  }, [activeLesson, marcarAulaComoConcluida]);

  const handlePostReview = useCallback(async (nota: number, comentario: string) => {
    if (!activeLesson?.modulo?.id) return;
    setIsPostingReview(true);
    try {
      const userName = AuthService.getName() || 'Usuário';
      const userAvatar = AuthService.getAvatar();
      const newReview: Review = {
        nota,
        comentario,
        usuario_nome: userName,
        usuario_avatar: userAvatar,
        created_at: new Date().toISOString(),
      };
      try {
        await ApiService.postAvaliacao(activeLesson.modulo.id, { modulo: activeLesson.modulo.id, nota, comentario });
      } catch {}
      setReviews((prev) => [newReview, ...prev]);
    } finally {
      setIsPostingReview(false);
    }
  }, [activeLesson]);

  const avgStars = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.nota, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="va-page">
        <div className="va-skeleton">
          <div className="va-skeleton__video" />
          <div className="va-skeleton__lines">
            <div className="va-skeleton__line w80" />
            <div className="va-skeleton__line w60" />
            <div className="va-skeleton__line w40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div className="va-page">
        <div className="va-error">
          <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '12px' }} />
          <h2>{error || 'Curso não encontrado'}</h2>
          <p>{error || 'Não foi possível carregar esta aula.'}</p>
          <button className="va-btn-accent" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const currentVideoUrl = activeLesson?.material?.url_externa || activeLesson?.material?.arquivo_url || '';
  const currentModulo = activeLesson?.modulo;
  const currentAulaIdx = activeLesson?.aulaIdx || 0;

  return (
    <div className="va-page">
      <ProgressTracker progresso={progressoGeral} />

      <div className="va-shell">
        <button
          className="va-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Abrir menu de aulas"
        >
          <i className={sidebarOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
        </button>

        <div
          className={'va-sidebar-overlay' + (sidebarOpen ? ' visible' : '')}
          onClick={() => setSidebarOpen(false)}
        />

        <div className={'va-sidebar-wrap' + (sidebarOpen ? ' open' : '')}>
          {curso && (
            <LessonSidebar
              cursoTitulo={curso.titulo}
              modulos={modulos}
              moduloAtualIdx={activeLesson?.moduloIdx ?? 0}
              aulaAtualIdx={activeLesson?.aulaIdx ?? 0}
              onSelectAula={handleSelectAula}
              progressoGeral={progressoGeral}
              completedLessons={completedLessons}
            />
          )}
        </div>

        <main className="va-main">
          <MobileTabs activeTab={mobileTab} onTabChange={setMobileTab} />

          <div className={'va-content' + (mobileTab !== 'video' ? ' hidden-mobile' : '')}>
            {currentVideoUrl ? (
              <VideoPlayer
                videoUrl={currentVideoUrl}
                title={activeLesson?.material?.titulo || curso.titulo}
                cursoId={curso.id}
                onEnded={handleVideoEnded}
              />
            ) : (
              <div className="va-no-video">
                <i className="fa-solid fa-video-slash" style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }} />
                <span>Nenhum vídeo disponível para esta aula.</span>
              </div>
            )}

            {activeLesson && (
              <LessonInfo
                curso={curso}
                tituloAula={activeLesson.material.titulo}
                moduloTitulo={currentModulo?.titulo}
                aulaIndex={currentAulaIdx}
                moduloId={currentModulo?.id}
              />
            )}

            <div className="va-tabs-section">
              <div className="va-tabs" role="tablist">
                <button
                  className={'va-tab' + (activeTab === 'materiais' ? ' active' : '')}
                  role="tab"
                  aria-selected={activeTab === 'materiais' ? 'true' : 'false'}
                  onClick={() => setActiveTab('materiais')}
                >
                  Materiais
                </button>
                <button
                  className={'va-tab' + (activeTab === 'anotacoes' ? ' active' : '')}
                  role="tab"
                  aria-selected={activeTab === 'anotacoes' ? 'true' : 'false'}
                  onClick={() => setActiveTab('anotacoes')}
                >
                  Anotações
                </button>
                <button
                  className={'va-tab' + (activeTab === 'sobre' ? ' active' : '')}
                  role="tab"
                  aria-selected={activeTab === 'sobre' ? 'true' : 'false'}
                  onClick={() => setActiveTab('sobre')}
                >
                  Sobre o Curso
                </button>
                <button
                  className={'va-tab' + (activeTab === 'avaliacoes' ? ' active' : '')}
                  role="tab"
                  aria-selected={activeTab === 'avaliacoes' ? 'true' : 'false'}
                  onClick={() => setActiveTab('avaliacoes')}
                >
                  Avaliações e Comentários
                </button>
              </div>

              {activeTab === 'materiais' && (
                <div className="va-tab-content">
                  <MaterialsList materiais={currentModulo?.materiais || []} />
                </div>
              )}

              {activeTab === 'anotacoes' && (
                <div className="va-tab-content">
                  <textarea
                    className="va-notes-area"
                    id="va-notes-area"
                    placeholder="Suas anotações sobre esta aula ficam aqui..."
                    aria-label="Campo de anotações da aula"
                    maxLength={4000}
                    defaultValue={(() => { try { return localStorage.getItem('orcoma_notes') || ''; } catch { return ''; } })()}
                    onChange={(e) => { try { localStorage.setItem('orcoma_notes', e.target.value); } catch {} }}
                  />
                  <button className="va-btn-accent sm" style={{ marginTop: '10px' }} onClick={() => {
                    const btn = document.querySelector('.va-btn-accent.sm') as HTMLButtonElement;
                    if (btn) { btn.textContent = 'Salvo ✓'; setTimeout(() => { btn.textContent = 'Salvar anotações'; }, 1500); }
                  }}>Salvar anotações</button>
                </div>
              )}

              {activeTab === 'sobre' && (
                <div className="va-tab-content">
                  <div id="va-aboutContent">
                    <p style={{ color: '#9ca3af', fontSize: '.84rem', lineHeight: 1.7, maxWidth: '600px' }}>
                      {curso.descricao || 'Nenhuma descrição disponível.'}
                    </p>
                    {modulos.map((m) => (
                      m.descricao ? (
                        <div key={m.id}>
                          <h4 style={{ color: '#e5e7eb', fontSize: '.82rem', margin: '16px 0 4px' }}>{m.titulo}</h4>
                          <p style={{ color: '#9ca3af', fontSize: '.82rem', lineHeight: 1.6, margin: 0 }}>{m.descricao}</p>
                        </div>
                      ) : null
                    ))}
                    <p style={{ color: '#6b7280', fontSize: '.76rem', marginTop: '12px' }}>
                      Tipo: {curso.tipo === 'video' ? 'Vídeo' : 'Curso'} · Status: {curso.status}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'avaliacoes' && (
                <div className="va-tab-content">
                  <RatingSystem
                    reviews={reviews}
                    averageStars={avgStars}
                    totalReviews={reviews.length}
                    onPostReview={handlePostReview}
                    isPosting={isPostingReview}
                  />
                </div>
              )}
            </div>
          </div>

          {mobileTab === 'aulas' && (
            <div className="va-mobile-aulas">
              {curso && (
                <LessonSidebar
                  cursoTitulo={curso.titulo}
                  modulos={modulos}
                  moduloAtualIdx={activeLesson?.moduloIdx ?? 0}
                  aulaAtualIdx={activeLesson?.aulaIdx ?? 0}
                  onSelectAula={handleSelectAula}
                  progressoGeral={progressoGeral}
                  completedLessons={completedLessons}
                />
              )}
            </div>
          )}

          {mobileTab === 'materiais' && (
            <div className="va-mobile-materiais">
              <MaterialsList materiais={currentModulo?.materiais || []} />
            </div>
          )}

          {mobileTab === 'comentarios' && (
            <div className="va-mobile-comentarios">
              <RatingSystem
                reviews={reviews}
                averageStars={avgStars}
                totalReviews={reviews.length}
                onPostReview={handlePostReview}
                isPosting={isPostingReview}
              />
            </div>
          )}
        </main>
      </div>

      {/* TOAST "Etapa Concluída!" */}
      <div className={'va-toast' + (showToast ? ' visible' : '')} aria-live="polite" aria-atomic="true">
        {toastMessage}
      </div>

      {showCourseCompleteModal && (
        <div className="va-complete-modal-overlay" onClick={() => setShowCourseCompleteModal(false)}>
          <div className="va-complete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="va-complete-modal__close" onClick={() => setShowCourseCompleteModal(false)}>
              ✕
            </button>
            <h2 className="va-complete-modal__title">🎉 Parabéns!</h2>
            <p className="va-complete-modal__text">Você concluiu este curso!</p>
            <div className="va-complete-modal__actions">
              <button className="va-btn-accent" onClick={() => { setShowCourseCompleteModal(false); navigate('/meus-cursos'); }}>
                Voltar aos Cursos
              </button>
              <button className="va-btn-ghost" onClick={() => setShowCourseCompleteModal(false)}>
                Revisar Aula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}