import { useRef, useEffect, useState, useCallback } from 'react';
import { VideoBlockerOverlay } from './VideoBlockerOverlay';
import { ConsentService } from '../../services/consent';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  cursoId: number | null;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onResumeAt?: (seconds: number) => void;
}

type VideoType = 'youtube' | 'vimeo' | 'html5' | 'unknown';

function detectVideoType(url: string): VideoType {
  if (!url) return 'unknown';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'html5';
}

function extractYouTubeId(url: string): string {
  const patterns = [
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return url.split('/').pop()?.split('?')[0] || '';
}

function extractVimeoId(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1]?.split('?')[0] || '';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function VideoPlayer({ videoUrl, title, cursoId, onProgress, onEnded }: VideoPlayerProps) {
  const videoType = detectVideoType(videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletedOverlay, setShowCompletedOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showTabPauseOverlay, setShowTabPauseOverlay] = useState(false);

  const [ytAllowed, setYtAllowed] = useState(() => ConsentService.hasAccepted());
  const [ytPrompt, setYtPrompt] = useState(false);
  const [ytError, setYtError] = useState(false);
  const [ytAttempt, setYtAttempt] = useState(0);

  const tempoAssistidoRef = useRef(0);
  const ultimoTempoRef = useRef(0);
  const cursoJaConcluidoRef = useRef(false);
  const watchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const vimeoPlayerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speeds = [0.5, 1, 1.5, 2];

  const getProgress = useCallback(() => {
    try {
      const storage = JSON.parse(localStorage.getItem('orcoma_progresso') || '{}');
      const email = localStorage.getItem('orcoma_user_email') || localStorage.getItem('orcoma_user_name') || 'guest';
      const userKey = 'user_' + email.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return storage.users?.[userKey]?.cursos?.[cursoId?.toString() || ''];
    } catch { return null; }
  }, [cursoId]);

  const saveProgress = useCallback((progresso: number) => {
    if (!cursoId || progresso <= 0 || progresso >= 100) return;
    const atual = getProgress();
    if (atual?.concluido) return;
    try {
      const storage = JSON.parse(localStorage.getItem('orcoma_progresso') || '{}');
      const email = localStorage.getItem('orcoma_user_email') || localStorage.getItem('orcoma_user_name') || 'guest';
      const userKey = 'user_' + email.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!storage.users) storage.users = {};
      if (!storage.users[userKey]) storage.users[userKey] = { cursos: {}, ultima_atualizacao: null };
      const key = cursoId.toString();
      storage.users[userKey].cursos[key] = {
        concluido: false,
        progresso: Math.max(atual?.progresso || 0, progresso),
        ultima_atualizacao: new Date().toISOString(),
        ultimo_segundo_assistido: Math.floor(ultimoTempoRef.current),
      };
      storage.users[userKey].ultima_atualizacao = new Date().toISOString();
      localStorage.setItem('orcoma_progresso', JSON.stringify(storage));
    } catch {}
  }, [cursoId, getProgress]);

  const markCompleted = useCallback(() => {
    if (cursoJaConcluidoRef.current) return;
    cursoJaConcluidoRef.current = true;
    setShowCompletedOverlay(true);
    setTimeout(() => setShowCompletedOverlay(false), 4000);
    if (onEnded) onEnded();
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
  }, [onEnded]);

  useEffect(() => {
    cursoJaConcluidoRef.current = false;
    tempoAssistidoRef.current = 0;
    ultimoTempoRef.current = 0;
    isSeekingRef.current = false;
  }, [videoUrl]);

  useEffect(() => {
    if (videoType !== 'html5' || !videoRef.current) return;
    const vid = videoRef.current;

    const onMeta = () => {
      setDuration(vid.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => {
      if (isSeekingRef.current) return;
      const cur = vid.currentTime;
      setCurrentTime(cur);
      const delta = cur - ultimoTempoRef.current;
      if (delta > 0) tempoAssistidoRef.current += Math.min(delta, 3);
      ultimoTempoRef.current = cur;
      if (vid.duration > 0) {
        const pct = Math.min(100, Math.round((tempoAssistidoRef.current / vid.duration) * 100));
        saveProgress(pct);
        if (onProgress) onProgress(cur, vid.duration);
        if (tempoAssistidoRef.current / vid.duration >= 0.90) markCompleted();
      }
    };
    const onPlay = () => { setIsPlaying(true); isPlayingRef.current = true; };
    const onPause = () => { setIsPlaying(false); isPlayingRef.current = false; };
    const onEndedHandler = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      markCompleted();
    };
    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    vid.addEventListener('loadedmetadata', onMeta);
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onEndedHandler);
    vid.addEventListener('loadstart', onLoadStart);
    vid.addEventListener('canplay', onCanPlay);

    return () => {
      vid.removeEventListener('loadedmetadata', onMeta);
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onEndedHandler);
      vid.removeEventListener('loadstart', onLoadStart);
      vid.removeEventListener('canplay', onCanPlay);
    };
  }, [videoType, saveProgress, onProgress, markCompleted]);

  useEffect(() => {
    if (videoType !== 'youtube' || !ytAllowed) return;
    const ytId = extractYouTubeId(videoUrl);
    if (!ytId) return;

    const w = window as any;
    let player: any = null;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    setYtError(false);
    setIsLoading(true);

    const clearLoadTimeout = () => {
      if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
    };

    const onPlayerReady = () => {
      if (cancelled) return;
      clearLoadTimeout();
      setIsLoading(false);
      try {
        setDuration(player.getDuration() || 0);
        player.playVideo();
      } catch {}
    };

    const onPlayerError = () => {
      if (cancelled) return;
      clearLoadTimeout();
      setIsLoading(false);
      setYtError(true);
      try { player?.destroy(); } catch {}
      ytPlayerRef.current = null;
    };

    const onPlayerStateChange = (event: any) => {
      if (event.data === 1) {
        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsLoading(false);
      } else if (event.data === 2) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else if (event.data === 3) {
        setIsLoading(true);
      } else if (event.data === 0) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        markCompleted();
      }
    };

    const startWatchInterval = () => {
      watchIntervalRef.current = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        if (isSeekingRef.current) return;
        try {
          const cur = player.getCurrentTime();
          const dur = player.getDuration();
          setCurrentTime(cur);
          const delta = cur - ultimoTempoRef.current;
          if (delta > 0) tempoAssistidoRef.current += Math.min(delta, 3);
          ultimoTempoRef.current = cur;
          if (dur > 0) {
            const pct = Math.min(100, Math.round((tempoAssistidoRef.current / dur) * 100));
            saveProgress(pct);
            if (onProgress) onProgress(cur, dur);
            if (tempoAssistidoRef.current / dur >= 0.90) markCompleted();
          }
        } catch {}
      }, 3000);
    };

    const createPlayer = () => {
      if (cancelled) return;
      const container = document.getElementById('yt-player-container');
      if (!container) return;
      try {
        player = new w.YT.Player('yt-player-container', {
          videoId: ytId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            playsinline: 1,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError,
          },
        });
        ytPlayerRef.current = player;
        startWatchInterval();
      } catch {
        if (!cancelled) {
          setIsLoading(false);
          setYtError(true);
        }
      }
    };

    const waitForApi = () => {
      if (cancelled) return;
      if (w.YT?.Player) { createPlayer(); return; }
      if (!w.__orcomaYtApiLoading) {
        w.__orcomaYtApiLoading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        const firstTag = document.getElementsByTagName('script')[0];
        firstTag?.parentNode?.insertBefore(tag, firstTag);
      }
      pollTimer = setTimeout(waitForApi, 250);
    };

    waitForApi();

    loadTimeout = setTimeout(() => {
      if (cancelled) return;
      clearLoadTimeout();
      setIsLoading(false);
      setYtError(true);
      w.__orcomaYtApiLoading = false;
      try { player?.destroy(); } catch {}
      ytPlayerRef.current = null;
    }, 20000);

    return () => {
      cancelled = true;
      clearLoadTimeout();
      if (pollTimer) clearTimeout(pollTimer);
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
      ytPlayerRef.current = null;
      try { player?.destroy(); } catch {}
    };
  }, [videoType, videoUrl, ytAllowed, ytAttempt, saveProgress, onProgress, markCompleted]);

  useEffect(() => {
    if (videoType !== 'vimeo') return;
    const vimeoId = extractVimeoId(videoUrl);
    if (!vimeoId) return;

    let player: any = null;

    const initVimeo = async () => {
      if (typeof (window as any).Vimeo === 'undefined' || !(window as any).Vimeo.Player) {
        const tag = document.createElement('script');
        tag.src = 'https://player.vimeo.com/api/player.js';
        document.head.appendChild(tag);
        tag.onload = () => setTimeout(initVimeo, 500);
        return;
      }

      const iframe = iframeRef.current;
      if (!iframe) return;
      player = new (window as any).Vimeo.Player(iframe);
      vimeoPlayerRef.current = player;

      const dur = await player.getDuration();
      setDuration(dur);
      setIsLoading(false);

      player.on('timeupdate', (data: any) => {
        if (isSeekingRef.current) return;
        const cur = data.seconds;
        setCurrentTime(cur);
        const delta = cur - ultimoTempoRef.current;
        if (delta > 0) tempoAssistidoRef.current += Math.min(delta, 3);
        ultimoTempoRef.current = cur;
        if (dur > 0) {
          const pct = Math.min(100, Math.round((tempoAssistidoRef.current / dur) * 100));
          saveProgress(pct);
          if (onProgress) onProgress(cur, dur);
            if (tempoAssistidoRef.current / dur >= 0.90) markCompleted();
        }
      });

      player.on('play', () => { setIsPlaying(true); isPlayingRef.current = true; });
      player.on('pause', () => { setIsPlaying(false); isPlayingRef.current = false; });
      player.on('ended', () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        markCompleted();
      });

      player.play();
    };

    initVimeo();

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
      vimeoPlayerRef.current = null;
      try { player?.destroy(); } catch {}
    };
  }, [videoType, videoUrl, saveProgress, onProgress, markCompleted]);

  const togglePlay = useCallback(() => {
    const playing = isPlayingRef.current;
    if (videoType === 'html5' && videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      const player = ytPlayerRef.current;
      try {
        if (typeof player.playVideo === 'function' && typeof player.pauseVideo === 'function') {
          if (playing) player.pauseVideo();
          else player.playVideo();
        }
      } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      const player = vimeoPlayerRef.current;
      try {
        if (playing) player.pause();
        else player.play();
      } catch {}
    }
  }, [videoType]);

  const handleSeekStart = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const time = parseFloat((e.target as HTMLInputElement).value);
    setCurrentTime(time);
    isSeekingRef.current = true;
  }, []);

  const applySeek = useCallback((time: number) => {
    isSeekingRef.current = false;
    if (videoType === 'html5' && videoRef.current) {
      videoRef.current.currentTime = time;
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(time, true); } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      try { vimeoPlayerRef.current.setCurrentTime(time); } catch {}
    }
  }, [videoType]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoType === 'html5' && videoRef.current) {
      videoRef.current.volume = vol;
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(vol * 100); } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      try { vimeoPlayerRef.current.setVolume(vol); } catch {}
    }
  }, [videoType]);

  const toggleMute = useCallback(() => {
    if (videoType === 'html5' && videoRef.current) {
      videoRef.current.muted = !isMuted;
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      try { isMuted ? ytPlayerRef.current.unMute() : ytPlayerRef.current.mute(); } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      try { vimeoPlayerRef.current.setMuted(!isMuted); } catch {}
    }
    setIsMuted(!isMuted);
  }, [videoType, isMuted]);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    if (videoType === 'html5' && videoRef.current) {
      videoRef.current.playbackRate = speed;
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.setPlaybackRate(speed); } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      try { vimeoPlayerRef.current.setPlaybackRate(speed); } catch {}
    }
  }, [videoType]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlayingRef.current) {
      hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (controlsRef.current && controlsRef.current.contains(e.target as Node)) {
      showControlsTemporarily();
      return;
    }
    togglePlay();
    showControlsTemporarily();
  }, [togglePlay, showControlsTemporarily]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          showControlsTemporarily();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          showControlsTemporarily();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          showControlsTemporarily();
          if (videoType === 'html5' && videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          } else if (videoType === 'youtube' && ytPlayerRef.current) {
            try { ytPlayerRef.current.seekTo(Math.max(0, ytPlayerRef.current.getCurrentTime() - 10), true); } catch {}
          } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
            try { vimeoPlayerRef.current.getCurrentTime().then((t: number) => vimeoPlayerRef.current.setCurrentTime(Math.max(0, t - 10))); } catch {}
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          showControlsTemporarily();
          if (videoType === 'html5' && videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          } else if (videoType === 'youtube' && ytPlayerRef.current) {
            try { ytPlayerRef.current.seekTo(ytPlayerRef.current.getCurrentTime() + 10, true); } catch {}
          } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
            try { vimeoPlayerRef.current.getCurrentTime().then((t: number) => vimeoPlayerRef.current.setCurrentTime(t + 10)); } catch {}
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, toggleFullscreen, toggleMute, showControlsTemporarily, videoType, duration]);

  const pauseVideo = useCallback(() => {
    if (videoType === 'html5' && videoRef.current) {
      videoRef.current.pause();
    } else if (videoType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.pauseVideo(); } catch {}
    } else if (videoType === 'vimeo' && vimeoPlayerRef.current) {
      try { vimeoPlayerRef.current.pause(); } catch {}
    }
  }, [videoType]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPlaying) {
        saveProgress(Math.min(100, Math.round((tempoAssistidoRef.current / (duration || 1)) * 100)));
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        pauseVideo();
        setShowTabPauseOverlay(true);
      } else if (!document.hidden) {
        setShowTabPauseOverlay(false);
      }
    };
    const handleWindowBlur = () => {
      if (isPlaying) {
        // Pequeno atraso para verificar se o foco voltou (ex: clique em iframe do YouTube/Vimeo)
        setTimeout(() => {
          if (!document.hasFocus() && isPlayingRef.current) {
            pauseVideo();
            setShowTabPauseOverlay(true);
          }
        }, 200);
      }
    };
    const handleWindowFocus = () => {
      setShowTabPauseOverlay(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isPlaying, duration, saveProgress, videoType, pauseVideo]);

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, []);

  const handlePlaceholderClick = useCallback(() => {
    if (ConsentService.hasAccepted()) {
      setYtAllowed(true);
    } else {
      setYtPrompt(true);
    }
  }, []);

  const acceptConsentForVideo = useCallback(() => {
    ConsentService.set('accepted');
    setYtPrompt(false);
    setYtAllowed(true);
  }, []);

  const rejectConsentForVideo = useCallback(() => {
    ConsentService.set('rejected');
    setYtPrompt(false);
  }, []);

  const renderVideo = () => {
    if (videoType === 'youtube') {
      const ytId = extractYouTubeId(videoUrl);
      if (!ytId) {
        return (
          <div className="va-no-video">
            <i className="fa-solid fa-video-slash" style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }} />
            <span>Nenhum vídeo disponível para esta aula.</span>
          </div>
        );
      }

      if (!ytAllowed) {
        return (
          <div className="va-yt-placeholder" onClick={handlePlaceholderClick}>
            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={title} loading="lazy" />
            <div className="va-yt-placeholder__shade" />
            <button type="button" className="va-yt-placeholder__play" aria-label="Reproduzir vídeo">
              <i className="fa-solid fa-play" />
            </button>
            {ytPrompt && (
              <div className="va-yt-consent" onClick={(e) => e.stopPropagation()}>
                <p>
                  Ao reproduzir, o YouTube pode armazenar cookies para fornecer o serviço de vídeo
                  e coletar estatísticas de acesso. Deseja continuar?
                </p>
                <div className="va-yt-consent__actions">
                  <button type="button" className="va-yt-consent__accept" onClick={acceptConsentForVideo}>
                    Aceitar e assistir
                  </button>
                  <button type="button" className="va-yt-consent__reject" onClick={rejectConsentForVideo}>
                    Não, obrigado
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      return (
        <div id="yt-player-container" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
      );
    }

    if (videoType === 'vimeo') {
      const vimeoId = extractVimeoId(videoUrl);
      return (
        <iframe
          ref={iframeRef}
          src={'https://player.vimeo.com/video/' + vimeoId + '?autoplay=1&title=0&byline=0&portrait=0'}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, border: 'none' }}
        />
      );
    }

    if (videoType === 'html5') {
      return (
        <video
          ref={videoRef}
          className="va-html5-video"
          preload="metadata"
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        >
          <source src={videoUrl} type="video/mp4" />
          Seu navegador não suporta vídeo HTML5.
        </video>
      );
    }

    return (
      <div className="va-no-video">
        <i className="fa-solid fa-video-slash" style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }} />
        <span>Nenhum vídeo disponível para esta aula.</span>
      </div>
    );
  };

  const canControlVideo =
    videoType !== 'unknown' &&
    !isLoading &&
    !ytError &&
    (videoType !== 'youtube' || ytAllowed) &&
    !showCompletedOverlay &&
    !showTabPauseOverlay;

  return (
    <div
      ref={containerRef}
      className="va-video-container"
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { if (isPlayingRef.current) setControlsVisible(false); }}
      onClick={handleContainerClick}
    >
      {renderVideo()}

      <VideoBlockerOverlay />

      {showCompletedOverlay && (
        <div className="va-completed-overlay">
          <div className="va-completed-badge">
            <div className="va-completed-badge__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="va-completed-badge__text">Aula Concluída!</span>
          </div>
        </div>
      )}

      {showTabPauseOverlay && (
        <div className="va-tab-pause-overlay">
          <div className="va-tab-pause-badge">
            <div className="va-tab-pause-badge__icon">
              <i className="fa-solid fa-eye-slash" />
            </div>
            <span className="va-tab-pause-badge__text">Vídeo pausado — troca de aba detectada</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="va-loading">
          <div className="va-loading-spinner" />
          <span>Carregando vídeo...</span>
        </div>
      )}

      {ytError && (
        <div className="va-yt-error">
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.6rem', opacity: 0.6 }} />
          <p>Não foi possível carregar o vídeo. Verifique sua conexão e tente novamente.</p>
          <button type="button" onClick={() => setYtAttempt((a) => a + 1)}>Tentar novamente</button>
        </div>
      )}

      {canControlVideo && (
        <button
          type="button"
          className={"va-center-btn" + (controlsVisible ? " visible" : "")}
          onClick={(e) => { e.stopPropagation(); togglePlay(); showControlsTemporarily(); }}
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? (
            <i className="fa-solid fa-pause" />
          ) : (
            <i className="fa-solid fa-play" style={{ marginLeft: '4px' }} />
          )}
        </button>
      )}

      <div ref={controlsRef} className={"va-controls" + (controlsVisible ? " visible" : "")}>
        <button
          className="va-controls__btn"
          onClick={() => { togglePlay(); showControlsTemporarily(); }}
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? (
            <i className="fa-solid fa-pause" />
          ) : (
            <i className="fa-solid fa-play" style={{ marginLeft: '2px' }} />
          )}
        </button>

        <div className="va-controls__timeline">
          <span className="va-controls__time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onInput={handleSeekStart}
            onMouseUp={(e) => applySeek(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => applySeek(parseFloat((e.target as HTMLInputElement).value))}
            className="va-controls__slider"
            aria-label="Barra de progresso"
          />
          <span className="va-controls__time">{formatTime(duration)}</span>
        </div>

        <div className="va-controls__right">
          <div className="va-controls__volume">
            <button
              className="va-controls__btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            >
              <i className={isMuted ? 'fa-solid fa-volume-xmark' : volume > 0.5 ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-low'} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="va-controls__volume-slider"
              aria-label="Volume"
            />
          </div>

          <div className="va-controls__speed">
            <button
              className="va-controls__speed-btn"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              aria-label="Velocidade de reprodução"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="va-controls__speed-menu">
                {speeds.map((s) => (
                  <button
                    key={s}
                    className={'va-controls__speed-option' + (playbackRate === s ? ' active' : '')}
                    onClick={() => changeSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="va-controls__btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            <i className={isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} />
          </button>
        </div>
      </div>
    </div>
  );
}
