import { describe, it, expect } from 'vitest';
import { fromUnixSeconds, formatDateTime, formatRelativeTime } from '../../src/js/utils/date.js';

describe('fromUnixSeconds', () => {
  it('converte i secondi di Hacker News in una data', () => {
    const date = fromUnixSeconds(1791640733);

    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2026-10-10T13:58:53.000Z');
  });

  it('restituisce null se il valore non è un numero', () => {
    expect(fromUnixSeconds(undefined)).toBeNull();
    expect(fromUnixSeconds('1791640733')).toBeNull();
    expect(fromUnixSeconds(NaN)).toBeNull();
  });
});

describe('formatDateTime', () => {
  const date = new Date('2026-10-10T13:58:53Z');

  it('scrive la data in italiano con giorno, mese, anno e ora', () => {
    expect(formatDateTime(date, { timeZone: 'Europe/Rome' })).toBe('10 ott 2026, 15:58');
  });

  it('tiene conto del fuso orario', () => {
    expect(formatDateTime(date, { timeZone: 'UTC' })).toBe('10 ott 2026, 13:58');
  });

  it('mette lo zero davanti a ore e minuti a una cifra', () => {
    const morning = new Date('2026-01-05T08:03:00Z');

    expect(formatDateTime(morning, { timeZone: 'Europe/Rome' })).toBe('5 gen 2026, 09:03');
  });

  it('restituisce una stringa vuota se la data manca', () => {
    expect(formatDateTime(null)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const secondsAgo = (seconds) => new Date(now.getTime() - seconds * 1000);

  it('sotto il minuto dice "adesso"', () => {
    expect(formatRelativeTime(secondsAgo(0), now)).toBe('adesso');
    expect(formatRelativeTime(secondsAgo(59), now)).toBe('adesso');
  });

  it('dice "adesso" anche se la data è qualche secondo nel futuro', () => {
    expect(formatRelativeTime(secondsAgo(-30), now)).toBe('adesso');
  });

  it('conta i minuti interi fino a un\'ora', () => {
    expect(formatRelativeTime(secondsAgo(60), now)).toBe('1 min fa');
    expect(formatRelativeTime(secondsAgo(119), now)).toBe('1 min fa');
    expect(formatRelativeTime(secondsAgo(5 * 60), now)).toBe('5 min fa');
    expect(formatRelativeTime(secondsAgo(3599), now)).toBe('59 min fa');
  });

  it('passa alle ore dopo 60 minuti', () => {
    expect(formatRelativeTime(secondsAgo(3600), now)).toBe('1 h fa');
    expect(formatRelativeTime(secondsAgo(2 * 3600), now)).toBe('2 h fa');
    expect(formatRelativeTime(secondsAgo(86399), now)).toBe('23 h fa');
  });

  it('passa ai giorni dopo 24 ore', () => {
    expect(formatRelativeTime(secondsAgo(86400), now)).toBe('ieri');
    expect(formatRelativeTime(secondsAgo(10 * 86400), now)).toBe('10 gg fa');
  });

  it('restituisce una stringa vuota se la data manca', () => {
    expect(formatRelativeTime(null, now)).toBe('');
  });
});
