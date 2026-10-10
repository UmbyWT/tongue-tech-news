import { describe, it, expect } from 'vitest';
import { toStory, getDomain, isHttpUrl } from '../../src/js/utils/story.js';
import { rawItem } from '../helpers/fakes.js';

describe('toStory', () => {
  it('tiene titolo, link e data della news', () => {
    const raw = rawItem(50033065, {
      title: 'DIY conveyor belt keyboard',
      url: 'https://github.com/google/mozc-devices',
    });

    const story = toStory(raw);

    expect(story).toEqual({
      id: 50033065,
      title: 'DIY conveyor belt keyboard',
      url: 'https://github.com/google/mozc-devices',
      domain: 'github.com',
      author: 'umby',
      publishedAt: new Date('2026-10-10T13:58:53Z'),
    });
  });

  it('se manca il link usa la discussione su Hacker News', () => {
    const story = toStory(rawItem(50032742, { url: undefined, title: 'Ask HN: come studiate?' }));

    expect(story.url).toBe('https://news.ycombinator.com/item?id=50032742');
    expect(story.domain).toBe('news.ycombinator.com');
  });

  it('non accetta link che non siano http o https', () => {
    const story = toStory(rawItem(7, { url: 'javascript:alert(1)' }));

    expect(story.url).toBe('https://news.ycombinator.com/item?id=7');
  });

  it('toglie gli spazi intorno al titolo', () => {
    expect(toStory(rawItem(1, { title: '  Titolo  ' })).title).toBe('Titolo');
  });

  it('scarta le news cancellate, morte o senza titolo', () => {
    expect(toStory(rawItem(1, { deleted: true }))).toBeNull();
    expect(toStory(rawItem(2, { dead: true }))).toBeNull();
    expect(toStory(rawItem(3, { title: '' }))).toBeNull();
    expect(toStory(rawItem(4, { title: undefined }))).toBeNull();
  });

  it('scarta la risposta null che l\'API dà per un id inesistente', () => {
    expect(toStory(null)).toBeNull();
    expect(toStory(undefined)).toBeNull();
  });

  it('lascia la data a null se l\'API non manda il tempo', () => {
    expect(toStory(rawItem(1, { time: undefined })).publishedAt).toBeNull();
  });
});

describe('getDomain', () => {
  it('estrae il dominio senza www', () => {
    expect(getDomain('https://www.newyorker.com/culture/essay')).toBe('newyorker.com');
    expect(getDomain('https://blog.example.co.uk/post?id=1')).toBe('blog.example.co.uk');
  });

  it('restituisce una stringa vuota se l\'indirizzo non è valido', () => {
    expect(getDomain('non un indirizzo')).toBe('');
    expect(getDomain('')).toBe('');
  });
});

describe('isHttpUrl', () => {
  it('accetta http e https', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
  });

  it('rifiuta gli altri protocolli e i valori vuoti', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});
