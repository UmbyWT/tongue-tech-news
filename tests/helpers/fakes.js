import { vi } from 'vitest';

// risposta dell'API per una news, come arriva da /item/<id>.json
export function rawItem(id, overrides = {}) {
  return {
    id,
    type: 'story',
    by: 'umby',
    time: 1791640733,
    title: `Notizia ${id}`,
    url: `https://example.com/news/${id}`,
    score: 1,
    descendants: 0,
    ...overrides,
  };
}

// client HTTP finto: risponde a /newstories.json e a /item/<id>.json
export function createFakeHttp({ ids = [], items = {}, failing = [] } = {}) {
  const get = vi.fn(async (path) => {
    if (path === '/newstories.json') return { data: ids };

    const id = Number(path.match(/\/item\/(\d+)\.json/)[1]);
    if (failing.includes(id)) throw new Error(`Richiesta fallita per ${id}`);
    return { data: id in items ? items[id] : rawItem(id) };
  });

  return { get };
}

// repository finto, per provare lo store senza passare dalla rete
export function createFakeRepository(ids) {
  return {
    getNewStoryIds: vi.fn(async () => ids),
    getStories: vi.fn(async (pageIds) =>
      pageIds.map((id) => ({
        id,
        title: `Notizia ${id}`,
        url: `https://example.com/news/${id}`,
        domain: 'example.com',
        author: 'umby',
        publishedAt: new Date('2026-10-10T13:58:53Z'),
      }))
    ),
  };
}

// 500 id decrescenti, come quelli veri
export function makeIds(count, first = 50033065) {
  return Array.from({ length: count }, (_, index) => first - index);
}
