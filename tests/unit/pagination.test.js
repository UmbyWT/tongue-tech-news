import { describe, it, expect } from 'vitest';
import { getPage, hasNextPage } from '../../src/js/utils/pagination.js';
import { makeIds } from '../helpers/fakes.js';

describe('getPage', () => {
  const ids = makeIds(25);

  it('prende i primi 10 elementi partendo da zero', () => {
    expect(getPage(ids, 0, 10)).toEqual(ids.slice(0, 10));
  });

  it('prende i 10 successivi senza ripetere i precedenti', () => {
    const first = getPage(ids, 0, 10);
    const second = getPage(ids, 10, 10);

    expect(second).toEqual(ids.slice(10, 20));
    expect(second.some((id) => first.includes(id))).toBe(false);
  });

  it('l\'ultimo blocco contiene solo gli elementi rimasti', () => {
    expect(getPage(ids, 20, 10)).toHaveLength(5);
  });

  it('restituisce un array vuoto oltre la fine della lista', () => {
    expect(getPage(ids, 30, 10)).toEqual([]);
  });

  it('restituisce un array vuoto con valori non validi', () => {
    expect(getPage(ids, -1, 10)).toEqual([]);
    expect(getPage(ids, 0, 0)).toEqual([]);
  });

  it('non modifica la lista originale', () => {
    const copy = [...ids];
    getPage(ids, 0, 10);

    expect(ids).toEqual(copy);
  });
});

describe('hasNextPage', () => {
  it('è vero finché restano elementi da caricare', () => {
    expect(hasNextPage(500, 0)).toBe(true);
    expect(hasNextPage(500, 490)).toBe(true);
  });

  it('è falso quando sono stati caricati tutti', () => {
    expect(hasNextPage(500, 500)).toBe(false);
    expect(hasNextPage(0, 0)).toBe(false);
  });
});
