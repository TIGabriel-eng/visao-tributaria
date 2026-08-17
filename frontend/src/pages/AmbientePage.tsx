import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import { ProgressService } from '../services/progress';
import type { Curso, DashboardData } from '../types';
import cursoNaoConcluidoImg from '../assets/images/curso-não-concluído.png';
import leaoImg from '../assets/images/leão.png';

interface AmbienteConfig {
  name: string;
  tagLabel: string;
  description: string;
  backTo: string;
  backLabel: string;
  parentKey: string;
}

const AMBIENTE_CONFIGS: Record<string, AmbienteConfig> = {
  contabil: {
    name: 'Academy Contábil',
    tagLabel: 'Academy Contábil',
    description: 'o seu ambiente de aprendizagem contábil.',
    backTo: '/business',
    backLabel: 'Voltar',
    parentKey: 'Academy Business',
  },
  empresarial: {
    name: 'Academy Gestão Empresarial',
    tagLabel: 'Academy Gestão Empresarial',
    description: 'o seu ambiente de aprendizagem em gestão empresarial.',
    backTo: '/business',
    backLabel: 'Voltar',
    parentKey: 'Academy Business',
  },
  time: {
    name: 'Academy Time',
    tagLabel: 'Academy Time',
    description: 'o seu ambiente de aprendizagem da equipe.',
    backTo: '/team',
    backLabel: 'Voltar',
    parentKey: 'Academy Team',
  },
  orcomakers: {
    name: 'Academy Orcomakers',
    tagLabel: 'Academy Orcomakers',
    description: 'o seu ambiente de aprendizagem Visão.',
    backTo: '/team',
    backLabel: 'Voltar',
    parentKey: 'Academy Team',
  },
};

export function AmbientePage() {
  const { pathname } = useLocation();
  const ambiente = pathname.split('/').filter(Boolean).pop() || '';
  const navigate = useNavigate();
  const config = AMBIENTE_CONFIGS[ambiente] || AMBIENTE_CONFIGS.time;

  const [userName, setUserName] = useState('Usuário');
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [continuar, setContinuar] = useState<{ curso: Curso; progresso: number } | null>(null);
  const [metricas, setMetricas] = useState<DashboardData['metricas'] | null>(null);
  const [userStats, setUserStats] = useState<{ horas_estudo: number; total_certificados: number; total_concluidos: number; meta_semanal: any } | null>(null);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [hoursPerDay, setHoursPerDay] = useState<number>(1);

  useEffect(() => {
    const name = AuthService.getName() || 'Usuário';
    setUserName(name);

    Promise.all([
      ApiService.getCursos().catch(() => []),
      ApiService.getDashboard().catch(() => null),
      ApiService.getUserStats().catch(() => null),
      ApiService.getMetasSemanais().catch(() => []),
    ]).then(([cursosData, dashData, statsData, metasData]) => {
      setCursos(cursosData || []);
      if (dashData) setMetricas(dashData.metricas);
      if (statsData) setUserStats(statsData);
      const metas = (metasData || []) as any[];
      const now = new Date();
      const atual = metas.find((m) => {
        const inicio = new Date(m.semana_inicio);
        const fim = new Date(m.semana_fim);
        return now >= inicio && now <= fim && !m.concluida;
      });
      if (atual) {
        setUserStats((prev) => ({...prev,
          horas_estudo: prev?.horas_estudo ?? 0,
          total_certificados: prev?.total_certificados ?? 0,
          total_concluidos: prev?.total_concluidos ?? 0,
          meta_semanal: atual,
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!cursos.length) return;
    ProgressService.getMapProgressos(cursos)
      .then((mapa) => {
        const emAndamento = cursos.find((c) => {
          const p = mapa[String(c.id)];
          return p && !p.concluido && p.progresso > 0 && p.progresso < 100;
        });
        if (emAndamento) {
          const p = mapa[String(emAndamento.id)];
          setContinuar({ curso: emAndamento, progresso: p?.progresso || 0 });
        }
      })
      .catch(() => {});
  }, [cursos]);

  const animateCounter = useCallback((el: HTMLElement | null, target: number) => {
    if (!el) return;
    const duration = 1500;
    const startTime = performance.now();
    const formatNumber = (v: number) => (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v));
    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = formatNumber(current);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    if (!metricas) return;
    const statEls = document.querySelectorAll('.stat-item__number');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-target') || '0', 10);
          animateCounter(entry.target as HTMLElement, target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [metricas, animateCounter]);

  const metaPercent = userStats?.meta_semanal?.percentual ?? 0;
  const hasMeta = !!userStats?.meta_semanal;

  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const saveMeta = async () => {
    const diasSelecionados = selectedDays.filter(Boolean).length;
    const totalHoras = diasSelecionados * hoursPerDay;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    try {
      const result = await ApiService.postMetaSemanal({
        titulo: 'Meta Semanal',
        meta_horas: totalHoras,
        semana_inicio: fmt(monday),
        semana_fim: fmt(sunday),
      });
      setUserStats((prev) => ({
        ...prev,
        horas_estudo: prev?.horas_estudo ?? 0,
        total_certificados: prev?.total_certificados ?? 0,
        total_concluidos: prev?.total_concluidos ?? 0,
        meta_semanal: result,
      }));
    } catch {}
    setMetaModalOpen(false);
  };

  return (
    <>
      <a href={config.backTo} className="btn-voltar" onClick={(e) => { e.preventDefault(); navigate(config.backTo); }}>
        <i className="fa-solid fa-arrow-left"></i> {config.backLabel}
      </a>

      <div className="hero-row">
        <section className="hero" style={{ position: 'relative' }}>
          <img src={leaoImg} alt="Leão" className="hero-welcome-img" />
          <div className="hero__welcome">
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'clamp(20px, 3.2vw, 42px)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Bem-Vindo de Volta<br />
              <span style={{ color: '#ff9d00' }}>{userName.split(' ')[0]}</span>
            </h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 'clamp(10px, 1.25vw, 18px)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
              Você está em{' '}
              <span className="tag-env" style={{ background: 'linear-gradient(135deg,#ff9d00,#e8941a)', color: '#000', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 15, display: 'inline-block' }}>
                {config.tagLabel}
              </span>,<br />
              {config.description}<br /><br />
               Você atingiu{' '}
              <strong style={{ color: 'var(--color-accent-2)' }}>{metaPercent}%</strong> da sua meta semanal!
            </p>
          </div>
        </section>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <div className="hero-stat-card__icon"><i className="fa-solid fa-clock"></i></div>
            <div className="hero-stat-card__info">
              <span className="hero-stat-card__label">Tempo de Estudo</span>
              <span className="hero-stat-card__value">{userStats?.horas_estudo ?? 0}h</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <div className="hero-stat-card__icon"><i className="fa-solid fa-check-circle"></i></div>
            <div className="hero-stat-card__info">
              <span className="hero-stat-card__label">Cursos Concluídos</span>
              <span className="hero-stat-card__value">{userStats?.total_concluidos ?? userStats?.total_certificados ?? 0}</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <div className="hero-stat-card__icon"><i className="fa-solid fa-bullseye"></i></div>
            <div className="hero-stat-card__info">
              <span className="hero-stat-card__label">Meta Semanal</span>
              {hasMeta ? (
                <div className="hero-stat-card__meta-progress">
                  <div className="hero-stat-card__progress-bar">
                    <div className="hero-stat-card__progress-fill" style={{ width: metaPercent + '%' }}></div>
                  </div>
                  <span className="hero-stat-card__value">{metaPercent}%</span>
                </div>
              ) : (
                <div className="hero-stat-card__cta">
                  <span>Você ainda não definiu uma meta semanal</span>
                  <button className="hero-stat-card__btn" onClick={() => setMetaModalOpen(true)}>Criar Meta</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '24px', fontWeight: 700, color: '#191919', margin: '16px 0 0', animation: 'fadeUp 1.5s ease both' }}>Continue Assistindo</h1>

      {continuar ? (
        <div className="continuar-card">
          <div className="continuar-card__thumb">
            <img src={continuar.curso.thumbnail_url || ''} alt={continuar.curso.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="continuar-card__play" onClick={() => navigate('/video-area/' + (continuar.curso.slug || continuar.curso.id))}>
              <i className="fa-solid fa-play"></i>
            </div>
          </div>
          <div className="continuar-card__body">
            <span className="continuar-card__tag">Curso</span>
            <h3 className="continuar-card__title">{continuar.curso.titulo}</h3>
            <span className="continuar-card__progress-label">Progresso da Aula</span>
            <div className="continuar-card__progress">
              <div className="continuar-card__bar"><div className="continuar-card__bar-fill" style={{ width: continuar.progresso + '%' }}></div></div>
              <span className="continuar-card__percent">{continuar.progresso}%</span>
            </div>
            <button className="continuar-card__btn" onClick={() => navigate('/video-area/' + (continuar.curso.slug || continuar.curso.id))}>Retomar curso <i className="fa-solid fa-arrow-right"></i></button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img src={cursoNaoConcluidoImg} alt="Nenhum curso em andamento" style={{ maxWidth: '160px', marginBottom: '10px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Você não tem nenhum curso em andamento!</p>
        </div>
      )}

      <section className="cursos-disponiveis">
        <div className="section-header">
          <h2>Cursos Disponíveis</h2>
        </div>

        <div className="cursos-grid">
          {cursos.length === 0 && (
            <p style={{ color: 'var(--color-text-secondary)', padding: 20, width: '100%' }}>Nenhum curso disponível no momento.</p>
          )}
          {cursos.map((curso) => {
            const slug = curso.slug || String(curso.id);
            const thumbSrc = curso.thumbnail_url || '';
            let statusLabel = 'Não-Iniciado';
            let statusClass = 'status-nao-iniciado';
            if ((curso as any).status_matricula === 'concluido') {
              statusLabel = 'Concluído';
              statusClass = 'status-concluido';
            } else if ((curso as any).status_matricula === 'em_andamento') {
              statusLabel = 'Em andamento';
              statusClass = 'status-em-andamento';
            }
            return (
              <div key={curso.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  <img src={thumbSrc} alt={curso.titulo} loading="lazy" />
                  <span className={`curso-card__status ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="curso-card__name">{curso.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__meta">
                  <span><i className="fa-solid fa-book"></i> Curso</span>
                  <span><i className="fa-solid fa-award"></i> Certificado</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stats-bar">
        <div className="stat-item">
          <i className="fa-solid fa-play-circle"></i>
          <div>
            <span className="stat-item__number" data-target={metricas?.cursos_ativos || 0}>0</span><span>+</span>
            <p>Cursos disponíveis</p>
          </div>
        </div>
        <div className="stat-item">
          <i className="fa-solid fa-users"></i>
          <div>
            <span className="stat-item__number" data-target={metricas?.total_usuarios || 0}>0</span><span>+</span>
            <p>Alunos ativos</p>
          </div>
        </div>
        <div className="stat-item">
          <i className="fa-solid fa-id-card"></i>
          <div>
            <span className="stat-item__number" data-target={metricas?.certificados_emitidos || 0}>0</span><span>+</span>
            <p>Certificados emitidos</p>
          </div>
        </div>
        <div className="stat-item">
          <i className="fa-solid fa-star"></i>
          <div>
            <span className="stat-item__number" data-target={metricas?.satisfacao_alunos || 0}>0</span><span>%</span>
            <p>Satisfação dos alunos</p>
          </div>
        </div>
      </section>

      {metaModalOpen && (
        <div className="meta-modal-overlay" onClick={() => setMetaModalOpen(false)}>
          <div className="meta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meta-modal__header">
              <h2>Criar Meta Semanal</h2>
              <button className="meta-modal__close" onClick={() => setMetaModalOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="meta-modal__body">
              <p className="meta-modal__label">Selecione os dias da semana:</p>
              <div className="meta-modal__days">
                {diasSemana.map((dia, i) => (
                  <button
                    key={i}
                    className={`meta-modal__day${selectedDays[i] ? ' is-active' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {dia}
                  </button>
                ))}
              </div>
              <p className="meta-modal__label" style={{ marginTop: 16 }}>Horas por dia:</p>
              <div className="meta-modal__hours">
                {[1, 2, 3, 4].map((h) => (
                  <button
                    key={h}
                    className={`meta-modal__hour${hoursPerDay === h ? ' is-active' : ''}`}
                    onClick={() => setHoursPerDay(h)}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <div className="meta-modal__summary">
                {selectedDays.filter(Boolean).length > 0 && (
                  <p>Total: <strong>{selectedDays.filter(Boolean).length * hoursPerDay}h</strong> por semana</p>
                )}
              </div>
            </div>
            <div className="meta-modal__footer">
              <button className="meta-modal__cancel" onClick={() => setMetaModalOpen(false)}>Cancelar</button>
              <button className="meta-modal__save" onClick={saveMeta} disabled={!selectedDays.some(Boolean)}>Salvar Meta</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
