import type { Evento } from '../types';
import { parseEventoData, diasRestantes, formatFullDate, buildGoogleCalendarUrl } from '../utils/evento';

interface EventoModalProps {
  evento: Evento;
  onClose: () => void;
  onMarcarLido?: () => void;
  marcandoLido?: boolean;
  marcadoLido?: boolean;
  avisoReaparece?: boolean;
  zIndex?: number;
}

export function EventoModal({ evento, onClose, onMarcarLido, marcandoLido = false, marcadoLido = false, avisoReaparece = false, zIndex = 1000 }: EventoModalProps) {
  const d = parseEventoData(evento.data);
  if (!d) return null;
  const dias = diasRestantes(d);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
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
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1.05rem',
            zIndex: 2,
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        {evento.imagem_url && (
          <img
            src={evento.imagem_url}
            alt={evento.titulo}
            style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
          />
        )}
        <div style={{ padding: '36.4px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.82rem', fontWeight: 700, marginBottom: '8px' }}>{evento.titulo || 'Evento'}</h2>
          <p style={{ color: 'var(--color-accent-2)', fontSize: '1.17rem', fontWeight: 600, marginBottom: '4px' }}>{formatFullDate(d)}</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.105rem', marginBottom: '20.8px' }}>em {dias} {dias === 1 ? 'dia' : 'dias'}</p>
          {evento.url && (
            <p style={{ marginBottom: '20.8px' }}>
              <a
                href={evento.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-accent-2)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  transition: 'color 0.2s, textDecorationColor 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#A37448';
                  e.currentTarget.style.textDecorationColor = '#A37448';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent-2)';
                  e.currentTarget.style.textDecorationColor = 'var(--color-accent-2)';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--color-accent-2)';
                  e.currentTarget.style.outlineOffset = '2px';
                  e.currentTarget.style.borderRadius = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {evento.url}
              </a>
            </p>
          )}
          {evento.descricao && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.17rem', lineHeight: 1.6, marginBottom: '31.2px' }}>{evento.descricao}</p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={buildGoogleCalendarUrl(evento, d)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10.4px',
                padding: '13px 26px',
                background: 'linear-gradient(135deg, var(--color-accent-2), #A37448)',
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
            {onMarcarLido && (
              <button
                onClick={onMarcarLido}
                disabled={marcandoLido || marcadoLido}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10.4px',
                  padding: '13px 26px',
                  background: marcadoLido ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '1.105rem',
                  cursor: marcandoLido || marcadoLido ? 'default' : 'pointer',
                  opacity: marcandoLido ? 0.7 : 1,
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <i className="fa-solid fa-check"></i> {marcadoLido ? 'Marcado como lido' : marcandoLido ? 'Salvando...' : 'Marcar como lido'}
              </button>
            )}
          </div>
          {avisoReaparece && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '20.8px', marginBottom: 0 }}>
              <i className="fa-regular fa-clock" style={{ marginRight: '6px' }}></i>
              Este comunicado reaparecerá em 24 horas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
