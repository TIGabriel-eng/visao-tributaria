import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import { ProgressService } from '../services/progress';
import { getChildAcademies } from '../types';
import type { Curso, Evento, Trilha, DashboardData, Ambiente } from '../types';
import cursoNaoConcluidoImg from '../assets/images/curso-não-concluído.png';
import banner1 from '../assets/images/banner1.png';
import banner2 from '../assets/images/banner2.png';

const heroSlides = [
  { src: banner1, alt: 'Banner Visão Academy 1' },
  { src: banner2, alt: 'Banner Visão Academy 2' },
];

const ACADEMY_DESC_BY_PATH: Record<string, string> = {
  '/time':
    'Treinamentos práticos que ajudem os colaboradores das empresas cliente a melhorarem sua performance no dia a dia.',
  '/orcomakers':
    'Treinamentos internos dos colaboradores da Visão Tributária, com o objetivo de padronizar os processos, desenvolver habilidades e fortalecer a cultura.',
  '/contabil':
    'Destinada a conteúdos técnicos, atualizações contábeis, fiscais, tributárias, trabalhistas e orientações importantes relacionadas à rotina empresarial.',
  '/empresarial':
    'Treinamentos voltados para o crescimento e desenvolvimento das empresas, indo além da contabilidade tradicional.',
};

const AMBIENTE_PATH_BY_NOME: Record<string, string> = {
  'Academy Contábil': '/contabil',
  'Academy Gestão Empresarial': '/empresarial',
  'Academy Team': '/time',
  'Academy Time': '/time',
  'Academy Orcomakers': '/orcomakers',
};

const normalizeNome = (s: string) => s.trim().toLowerCase();

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = heroSlides.length;

  const next = useCallback(() => setCurrent((p) => (p + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + total) % total), [total]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) next();
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [next]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pausedRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    pausedRef.current = false;
  };

  return (
    <div
      className="hero__carousel"
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de imagens"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero__carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {heroSlides.map((slide, i) => (
          <div className="hero__carousel-slide" key={i}>
            <img src={slide.src} alt={slide.alt} loading={i === current || i === (current + 1) % total ? 'lazy' : 'eager'} />
          </div>
        ))}
      </div>
      <button className="hero__carousel-arrow hero__carousel-arrow--left" onClick={prev} aria-label="Slide anterior">
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <button className="hero__carousel-arrow hero__carousel-arrow--right" onClick={next} aria-label="Próximo slide">
        <i className="fa-solid fa-chevron-right"></i>
      </button>
      <div className="hero__carousel-dots" role="group" aria-label="Navegação do carrossel">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            className={`hero__carousel-dot${i === current ? ' is-active' : ''}`}
            onClick={() => setCurrent(i)}
            role="button"
            aria-label={`Ir para slide ${i + 1}`}
            aria-current={i === current ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursosLoaded, setCursosLoaded] = useState(false);
  const [recomendados, setRecomendados] = useState<Curso[]>([]);
  const [, setEventos] = useState<Evento[]>([]);
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [metricas, setMetricas] = useState<DashboardData['metricas'] | null>(null);
  const [continuar, setContinuar] = useState<{ curso: Curso; progresso: number } | null>(null);

  useEffect(() => {
    // Carrega cursos PRIMEIRO (prioridade máxima)
    ApiService.getCursos()
      .then((cursosData) => {
        setCursos(cursosData || []);
        setCursosLoaded(true);
      })
      .catch(() => setCursosLoaded(true));

    // Depois carrega o restante em paralelo
    ApiService.getCursosRecomendados()
      .then((recData) => setRecomendados(recData || []))
      .catch(() => {});

    ApiService.getEventos()
      .then((eventosData) => {
        const ev = (eventosData || []) as Evento[];
        const now = new Date();
        const future = ev
          .map((e) => {
            const parts = e.data.split(' ');
            if (parts.length < 2) return null;
            const dp = parts[0].split('/');
            const tp = parts[1].split(':');
            if (dp.length < 3 || tp.length < 2) return null;
            const d = new Date(parseInt(dp[2]), parseInt(dp[1]) - 1, parseInt(dp[0]), parseInt(tp[0]), parseInt(tp[1]));
            return d > now ? e : null;
          })
          .filter(Boolean) as Evento[];
        future.sort((a, b) => {
          const da = new Date(a.data.split(' ')[0].split('/').reverse().join('-'));
          const db = new Date(b.data.split(' ')[0].split('/').reverse().join('-'));
          return da.getTime() - db.getTime();
        });
        setEventos(future.slice(0, 5));
      })
      .catch(() => {});

    ApiService.getTrilhas()
      .then((trilhasData) => setTrilhas(trilhasData || []))
      .catch(() => {});

    ApiService.getAmbientes()
      .then((ambData) => setAmbientes(ambData || []))
      .catch(() => {});

    ApiService.getDashboard()
      .then((dashData) => { if (dashData) setMetricas(dashData.metricas); })
      .catch(() => {});
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

  return (
    <>
      <HeroCarousel />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 0', animation: 'fadeUp 1.5s ease both' }}>
        <a href="/meus-cursos" className="btn-hero">Explorar conteúdos <i className="fa-solid fa-arrow-right"></i></a>
      </div>

      <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '24px', fontWeight: 700, color: '#191919', margin: '8px 0 0', padding: '16px 24px 8px', animation: 'fadeUp 1.5s ease both' }}>Seu Ambiente de Aprendizagem</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', justifyContent: 'center' }}>
        {getChildAcademies(AuthService.getCurrentAcademy()).map((academy) => {
          const ambiente =
            ambientes.find((a) => normalizeNome(a.nome) === normalizeNome(academy.name)) ||
            ambientes.find((a) => AMBIENTE_PATH_BY_NOME[a.nome] === academy.path);
          const thumb = ambiente?.imagem_url || '';
          const descricao =
            ambiente?.descricao?.trim() || ACADEMY_DESC_BY_PATH[academy.path] || '';
          return (
            <a key={academy.path} href={academy.path} className="ambiente-card" data-academy={academy.name}
              onClick={(e) => { e.preventDefault(); navigate(academy.path); }}
            >
              <div className="ambiente-card__image">
                {thumb ? (
                  <img src={thumb} alt={academy.name} loading="lazy" />
                ) : (
                  <div className="ambiente-card__placeholder">
                    <span>{academy.name.charAt(0)}</span>
                  </div>
                )}
                <span className="ambiente-card__badge">Ambiente</span>
                <span className="ambiente-card__ribbon">NOVO</span>
              </div>
              <div className="ambiente-card__info">
                <h3>{academy.name}</h3>
                <div className="ambiente-card__divider"></div>
                <p className="ambiente-card__desc">{descricao}</p>
                <div className="ambiente-card__meta">
                  <span><i className="fa-solid fa-arrow-right"></i> Acessar</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="section__header" style={{ margin: '16px 0 0', animation: 'fadeUp 1.5s ease both' }}>
        <h2 className="section__title" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '24px', color: '#191919' }}>Continue Assistindo</h2>
        <a href="/continuar-assistindo" className="section__link">Ver todos</a>
      </div>

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

      <div className="bottom-row">
        <section className="learning-paths">
          <div className="learning-paths__header">
            <h3 className="learning-paths__title" style={{ fontSize: '1.6rem', fontWeight: 800 }}>Trilhas de Aprendizagem</h3>
            <a href="/trilhas">Ver todas as trilhas →</a>
          </div>
          <div className="courses-slider-wrapper">
            <button className="trilhas-next-btn" onClick={() => {
              const slider = document.getElementById('trilhasSlider');
              const step = window.innerWidth <= 480 ? (slider?.clientWidth || 260) : 260;
              slider?.scrollBy({ left: step, behavior: 'smooth' });
            }}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
            <div className="learning-paths__list" id="trilhasSlider">
              {trilhas.map((t) => (
                <div key={t.id} className="trail-card" onClick={() => navigate('/trilhas/' + t.id)}>
                  <div className="trail-card__icon"><i className="fas fa-route"></i></div>
                  <h3>{t.nome}</h3>
                </div>
              ))}
            </div>
            <button className="trilhas-prev-btn" onClick={() => {
              const slider = document.getElementById('trilhasSlider');
              const step = window.innerWidth <= 480 ? (slider?.clientWidth || 260) : 260;
              slider?.scrollBy({ left: -step, behavior: 'smooth' });
            }}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          </div>
        </section>
      </div>

      <h1 className="section-tittle" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '24px', fontWeight: 700, color: '#191919', margin: '16px 0 0', padding: '16px 24px 8px', animation: 'fadeUp 1.5s ease both' }}>Curso Recomendado para você!</h1>
      {!cursosLoaded ? (
        <div className="cursos-grid" style={{ animation: 'fadeUp 1.5s ease both' }}>
          <div className="curso-card">
            <div className="curso-card__image" style={{ background: 'var(--color-bg-tertiary)', height: '180px', borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ height: '20px', background: 'var(--color-bg-tertiary)', margin: '12px', borderRadius: '6px', animation: 'pulse 1.5s infinite 0.2s' }}></div>
            <div style={{ height: '14px', background: 'var(--color-bg-tertiary)', margin: '0 12px 12px', borderRadius: '6px', width: '60%', animation: 'pulse 1.5s infinite 0.4s' }}></div>
          </div>
        </div>
      ) : recomendados.length > 0 && (
        <div className="cursos-grid" style={{ animation: 'fadeUp 1.5s ease both' }}>
          {recomendados.slice(0, 1).map((c) => {
            const slug = c.slug || c.id;
            const thumb = c.thumbnail_url || '';
            const isConcluido = (c as any).status_matricula === 'concluido';
            return (
              <div key={c.id} className="curso-card" onClick={() => navigate('/video-area/' + slug)}>
                <div className="curso-card__image">
                  <img src={thumb} alt={c.titulo} loading="lazy" />
                  <span className={`curso-card__status ${isConcluido ? 'status-concluido' : 'status-em-andamento'}`}>
                    {isConcluido ? 'Concluído' : 'Recomendado'}
                  </span>
                </div>
                <div className="curso-card__name">{c.titulo}</div>
                <div className="curso-card__divider"></div>
                <div className="curso-card__meta">
                  <span><i className="fa-solid fa-book"></i> Curso</span>
                  <span><i className="fa-solid fa-award"></i> Certificado</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </>
  );
}