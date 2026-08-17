import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { Notificacao } from '../types';

export function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getNotificacoes()
      .then((data) => setNotificacoes(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.6rem', fontWeight: 700, color: '#191919' }}>Notificações</h1>
        {notificacoes.some((n) => !n.lida) && (
          <button
            onClick={handleMarcarTodasLidas}
            style={{
              background: 'rgba(122, 82, 48, 0.1)',
              border: '1px solid rgba(122, 82, 48, 0.2)',
              color: 'var(--color-accent)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <p style={{ marginTop: '12px' }}>Carregando notificações...</p>
        </div>
      ) : notificacoes.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
          <i className="fa-regular fa-bell-slash" style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600 }}>Nenhuma notificação</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notificacoes.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '18px 20px',
                cursor: 'pointer',
                background: n.lida ? 'var(--color-surface)' : 'rgba(122, 82, 48, 0.06)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 82, 48, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = n.lida ? 'var(--color-surface)' : 'rgba(122, 82, 48, 0.06)'; }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(122, 82, 48, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className={getIcon(n.tipo)} style={{ color: getIconColor(n.tipo), fontSize: '1rem' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.titulo}</span>
                    {!n.lida && (
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#7A5230',
                        marginLeft: '8px',
                        verticalAlign: 'middle',
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {n.mensagem}
                </p>
                {n.link && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginTop: '6px', display: 'inline-block', fontWeight: 500 }}>
                    Ver mais <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}