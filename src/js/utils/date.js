const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Hacker News dà il tempo in secondi, Date lo vuole in millisecondi
export function fromUnixSeconds(seconds) {
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

// "10 ott 2026, 15:42"
export function formatDateTime(date, { locale = 'it-IT', timeZone } = {}) {
  if (!date) return '';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

// "adesso", "5 min fa", "3 h fa", "ieri", "4 gg fa"
export function formatRelativeTime(date, now = new Date(), locale = 'it') {
  if (!date) return '';

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // sotto il minuto, oppure orologio del dispositivo un po' indietro
  if (seconds < MINUTE) return 'adesso';

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });

  if (seconds < HOUR) return formatter.format(-Math.floor(seconds / MINUTE), 'minute');
  if (seconds < DAY) return formatter.format(-Math.floor(seconds / HOUR), 'hour');
  return formatter.format(-Math.floor(seconds / DAY), 'day');
}
