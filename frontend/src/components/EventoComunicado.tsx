import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { Evento } from '../types';
import { EventoModal } from './EventoModal';

interface ProximoEventoResponse {
  evento: Evento | null;
  ultima_leitura: string | null;
  requer_leitura: boolean;
}

export function EventoComunicado() {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    ApiService.getProximoEvento()
      .then((data) => {
        if (cancelado) return;
        const res = data as ProximoEventoResponse;
        if (res?.evento && res.requer_leitura) {
          setEvento(res.evento);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  if (!evento) return null;

  const handleMarcarLido = () => {
    if (marcando) return;
    setMarcando(true);
    ApiService.marcarEventoLido(evento.id)
      .then(() => setEvento(null))
      .catch(() => {})
      .finally(() => setMarcando(false));
  };

  return (
    <EventoModal
      evento={evento}
      onClose={() => setEvento(null)}
      onMarcarLido={handleMarcarLido}
      marcandoLido={marcando}
      avisoReaparece
    />
  );
}
