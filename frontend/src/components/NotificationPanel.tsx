import { useEffect, useState, useRef } from 'react';
import { ApiService } from '../services/api';
import type { Notificacao } from '../types';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ApiService.getNotificacoes()
      .then((data) => setNotificacoes(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const handleMarcarLida = async (id: number) => {
    try {
      await ApiService.marcarNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch {}
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await ApiService.marcarTodasNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch {}
  };

  const handleClick = (n: Notificacao) => {
    if (!n.lida) handleMarcarLida(n.id);
    if (n.link) window.location.href = n.link;
    onClose();
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'boas_vindas': return 'fa-solid fa-hand-wave';
      case 'curso_concluido': return 'fa-solid fa-certificate';
      case 'evento': return 'fa-regular fa-calendar-check';
      default: return 'fa-regular fa-bell';
    }
  };

  const getIconColor = (tipo: string) => {
    switch (tipo) {
      case 'boas_vindas': return '#7A5230';
      case 'curso_concluido': return '#f59e0b';
      case 'evento': return '#34d399';
      default: return 'var(--color-text-muted)';
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="notification-panel"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '380px',
        maxHeight: '480px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#191919' }}>Notificações</span>
        {notificacoes.some((n) => !n.lida) && (
          <button
            onClick={handleMarcarTodasLidas}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: 0,
            }}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem' }}></i>
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Carregando...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
            <i className="fa-regular fa-bell-slash" style={{ fontSize: '1.5rem' }}></i>
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Nenhuma notificação</p>
          </div>
        ) : (
          notificacoes.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '14px 20px',
                cursor: 'pointer',
                background: n.lida ? 'transparent' : 'rgba(122, 82, 48, 0.06)',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 82, 48, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(122, 82, 48, 0.06)'; }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(122, 82, 48, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className={getIcon(n.tipo)} style={{ color: getIconColor(n.tipo), fontSize: '0.9rem' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.titulo}
                  </span>
                  {!n.lida && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#7A5230',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {n.mensagem}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}
      >
        <a
          href="/notificacoes"
          onClick={(e) => { e.preventDefault(); window.location.href = '/notificacoes'; onClose(); }}
          style={{
            color: 'var(--color-accent)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Ver todas as notificações <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i>
        </a>
      </div>
    </div>
  );
}