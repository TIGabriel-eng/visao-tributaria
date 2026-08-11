import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { Evento } from '../types';

const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
const mesesExt = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function parseEventoData(data: string): Date | null {
  const parts = data.split(' ');
  if (parts.length < 2) return null;
  const dp = parts[0].split('/');
  const tp = parts[1].split(':');
  if (dp.length < 3 || tp.length < 2) return null;
  return new Date(parseInt(dp[2]), parseInt(dp[1]) - 1, parseInt(dp[0]), parseInt(tp[0]), parseInt(tp[1]));
}

function diasRestantes(d: Date): number {
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatFullDate(d: Date): string {
  const diaSemana = diasSemana[d.getDay()];
  const mes = mesesExt[d.getMonth()];
  const dia = d.getDate();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${diaSemana}, ${dia} DE ${mes} • ${hora}`;
}

function buildGoogleCalendarUrl(ev: Evento, d: Date): string {
  const end = new Date(d.getTime() + 60 * 60 * 1000);
  const fmtDate = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.titulo || 'Evento',
    dates: `${fmtDate(d)}/${fmtDate(end)}`,
    details: ev.descricao || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selected, setSelected] = useState<Evento | null>(null);

  useEffect(() => {
    ApiService.getEventos()
      .then((data) => {
        const ev = (data || []) as Evento[];
        const now = new Date();
        const future = ev
          .map((e) => {
            const d = parseEventoData(e.data);
            return d && d > now ? e : null;
          })
          .filter(Boolean) as Evento[];
        future.sort((a, b) => {
          const da = parseEventoData(a.data);
          const db = parseEventoData(b.data);
          return (da?.getTime() || 0) - (db?.getTime() || 0);
        });
        setEventos(future);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#ff9d00' }}>Eventos</h1>
      {eventos.length === 0 ? (
        <div className="events-empty" style={{ textAlign: 'center', padding: '40px 0' }}>
          <i className="ti ti-calendar-off" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}></i>
          <p>Nenhum evento agendado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '900px' }}>
          {eventos.map((ev) => {
            const d = parseEventoData(ev.data);
            if (!d) return null;
            const mes = meses[d.getMonth()];
            const dia = d.getDate();
            const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dias = diasRestantes(d);
            return (
              <div
                key={ev.id}
                onClick={() => setSelected(ev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '900px',
                  minHeight: '83px',
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'; }}
              >
                <div className="events-list__date" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  <span className="events-list__month" style={{ color: '#60a5fa' }}>{mes}</span>
                  <span className="events-list__day">{dia}</span>
                </div>
                <div className="events-list__info">
                  <div className="events-list__title" style={{ fontSize: '1rem', fontWeight: 600 }}>{ev.titulo || 'Evento'}</div>
                  <div className="events-list__time">{hora}</div>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: dias <= 7 ? '#60a5fa' : '#93c5fd',
                  background: 'rgba(59, 130, 246, 0.12)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  em {dias} {dias === 1 ? 'dia' : 'dias'}
                </span>
                <i className="ti ti-chevron-right events-list__arrow" style={{ color: '#60a5fa' }}></i>
              </div>
            );
          })}
        </div>
      )}

      {selected && (() => {
        const d = parseEventoData(selected.data);
        if (!d) return null;
        const dias = diasRestantes(d);
        return (
          <div
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '24px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                maxWidth: '832px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
            >
              {selected.imagem_url && (
                <img
                  src={selected.imagem_url}
                  alt={selected.titulo}
                  style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
                />
              )}
              <div style={{ padding: '36.4px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.82rem', fontWeight: 700, marginBottom: '8px' }}>{selected.titulo || 'Evento'}</h2>
                <p style={{ color: '#60a5fa', fontSize: '1.17rem', fontWeight: 600, marginBottom: '4px' }}>{formatFullDate(d)}</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.105rem', marginBottom: '20.8px' }}>em {dias} {dias === 1 ? 'dia' : 'dias'}</p>
                {selected.url && (
                  <p style={{ marginBottom: '20.8px' }}>
                    <a 
                      href={selected.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#3b82f6', 
                        fontWeight: 600, 
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        transition: 'color 0.2s, textDecorationColor 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#2563eb';
                        e.currentTarget.style.textDecorationColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#3b82f6';
                        e.currentTarget.style.textDecorationColor = '#3b82f6';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = '2px solid #3b82f6';
                        e.currentTarget.style.outlineOffset = '2px';
                        e.currentTarget.style.borderRadius = '2px';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = 'none';
                      }}
                    >
                      {selected.url}
                    </a>
                  </p>
                )}
                {selected.descricao && (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.17rem', lineHeight: 1.6, marginBottom: '31.2px' }}>{selected.descricao}</p>
                )}
                <a
                  href={buildGoogleCalendarUrl(selected, d)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10.4px',
                    padding: '13px 26px',
                    background: 'linear-gradient(135deg, var(--color-accent-2), #2563eb)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    fontSize: '1.105rem',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <i className="fa-regular fa-calendar-plus"></i> Adicionar ao calendário
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
