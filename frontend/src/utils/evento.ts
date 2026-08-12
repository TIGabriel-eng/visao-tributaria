import type { Evento } from '../types';

const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
const mesesExt = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function parseEventoData(data: string): Date | null {
  const parts = data.split(' ');
  if (parts.length < 2) return null;
  const dp = parts[0].split('/');
  const tp = parts[1].split(':');
  if (dp.length < 3 || tp.length < 2) return null;
  return new Date(parseInt(dp[2]), parseInt(dp[1]) - 1, parseInt(dp[0]), parseInt(tp[0]), parseInt(tp[1]));
}

export function diasRestantes(d: Date): number {
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatFullDate(d: Date): string {
  const diaSemana = diasSemana[d.getDay()];
  const mes = mesesExt[d.getMonth()];
  const dia = d.getDate();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${diaSemana}, ${dia} DE ${mes} • ${hora}`;
}

export function formatMesAbrev(d: Date): string {
  return meses[d.getMonth()];
}

export function buildGoogleCalendarUrl(ev: Evento, d: Date): string {
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
