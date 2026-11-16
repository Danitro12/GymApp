// ─── Fechas en hora LOCAL ─────────────────────────────────────────────────────
// toISOString() devuelve la fecha en UTC: en España, un entreno a las 00:30
// se guardaba con la fecha del día anterior. Usamos siempre la fecha local.

export const toDateKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fromDateKey = (key) => new Date(`${key}T00:00:00`);

// Lunes = 0 … Domingo = 6
export const weekdayIndex = (date = new Date()) => (date.getDay() + 6) % 7;

export const localeFor = (language) => (language === 'es' ? 'es-ES' : 'en-US');

export const formatDuration = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// Duración de un entreno del historial en minutos ("<1" si no llega a uno).
export const historyMinutes = (entry) => {
  const secs = entry?.durationSeconds ?? (entry?.duration || 0) * 60;
  return secs > 0 && secs < 60 ? '<1' : String(Math.round(secs / 60));
};
