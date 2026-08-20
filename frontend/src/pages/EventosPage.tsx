import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { EventoModal } from '../components/EventoModal';
import { parseEventoData, diasRestantes, formatMesAbrev } from '../utils/evento';
import type { Evento } from '../types';

export function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [marcandoLido, setMarcandoLido] = useState(false);
  const [marcadoLido, setMarcadoLido] = useState(false);

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

  const handleMarcarLido = () => {
    if (!selected || marcandoLido || marcadoLido) return;
    setMarcandoLido(true);
    ApiService.marcarEventoLido(selected.id)
      .then(() => setMarcadoLido(true))
      .catch(() => {})
      .finally(() => setMarcandoLido(false));
  };

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Eventos</h1>
      {eventos.length === 0 ? (
        <div className="events-empty" style={{ textAlign: 'center', padding: '40px 0' }}>
          <i className="ti ti-calendar-off" style={{ fontSize: '2.8rem', marginBottom: '8px', display: 'block', color: '#333333' }}></i>
           <p style={{ fontSize: '18px', color: '#333333' }}>Nenhum evento agendado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '900px' }}>
          {eventos.map((ev) => {
            const d = parseEventoData(ev.data);
            if (!d) return null;
            const mes = formatMesAbrev(d);
            const dia = d.getDate();
            const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dias = diasRestantes(d);
            return (
              <div
                key={ev.id}
                onClick={() => { setSelected(ev); setMarcadoLido(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '900px',
                  minHeight: '83px',
                  padding: '16px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.4) 100%), #512614',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%), #512614'; e.currentTarget.style.borderColor = 'rgba(240, 169, 59, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.4) 100%), #512614'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <div className="events-list__date" style={{ background: 'rgba(255, 255, 255, 0.12)' }}>
                  <span className="events-list__month" style={{ color: '#F0A93B' }}>{mes}</span>
                  <span className="events-list__day">{dia}</span>
                </div>
                <div className="events-list__info">
                  <div className="events-list__title" style={{ fontSize: '1rem', fontWeight: 600 }}>{ev.titulo || 'Evento'}</div>
                  <div className="events-list__time">{hora}</div>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: dias <= 7 ? '#F0A93B' : '#E8B167',
                  background: 'rgba(255, 255, 255, 0.12)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  em {dias} {dias === 1 ? 'dia' : 'dias'}
                </span>
                <i className="ti ti-chevron-right events-list__arrow" style={{ color: '#C9BDA3' }}></i>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <EventoModal
          evento={selected}
          onClose={() => setSelected(null)}
          onMarcarLido={handleMarcarLido}
          marcandoLido={marcandoLido}
          marcadoLido={marcadoLido}
        />
      )}
    </div>
  );
}
