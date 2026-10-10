// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createNewsRepository } from '../../src/js/api/newsRepository.js';
import { createNewsStore } from '../../src/js/store/newsStore.js';
import { createNewsView } from '../../src/js/ui/newsView.js';
import { createFakeHttp, makeIds, rawItem } from '../helpers/fakes.js';

// Test di integrazione: repository, store e vista veri, montati sull'HTML
// vero di index.html. Di finto c'è solo il client HTTP.
const html = readFileSync('index.html', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script'));

function mountApp(httpOptions) {
  document.body.innerHTML = body;

  const http = createFakeHttp(httpOptions);
  const store = createNewsStore({ repository: createNewsRepository(http) });
  const view = createNewsView(document, {
    onLoadMore: store.loadMore,
    onRetry: store.retry,
    onRefresh: store.loadInitial,
  });
  store.subscribe(view.render);

  return { http, store, view };
}

const find = (name) => document.querySelector(`[data-js="${name}"]`);
const stories = () => [...document.querySelectorAll('.story:not(.story--skeleton)')];
const skeletons = () => document.querySelectorAll('[data-js="skeleton"]');
const itemCalls = (http) => http.get.mock.calls.filter(([path]) => path.startsWith('/item/'));

// aspetta che lo store abbia finito il caricamento partito dal click
async function click(element, store) {
  element.click();
  await vi.waitFor(() => expect(['ready', 'error']).toContain(store.getState().status));
}

describe('avvio dell\'applicazione', () => {
  let ids;

  beforeEach(() => {
    ids = makeIds(500);
  });

  it('mostra le righe segnaposto mentre aspetta i dati', () => {
    const { store } = mountApp({ ids });

    store.loadInitial();

    expect(skeletons()).toHaveLength(10);
    expect(find('load-more').hidden).toBe(true);
  });

  it('mostra le prime 10 news con 10 sole chiamate di dettaglio', async () => {
    const { http, store } = mountApp({ ids });

    await store.loadInitial();

    expect(stories()).toHaveLength(10);
    expect(skeletons()).toHaveLength(0);
    expect(itemCalls(http)).toHaveLength(10);
    expect(http.get).toHaveBeenCalledWith('/newstories.json');
    expect(http.get).toHaveBeenCalledWith(`/item/${ids[0]}.json`);
    expect(http.get).not.toHaveBeenCalledWith(`/item/${ids[10]}.json`);
  });

  it('ogni news ha titolo, link e data di pubblicazione', async () => {
    const first = rawItem(ids[0], {
      title: 'How I Became a Lock Picker',
      url: 'https://www.newyorker.com/essay',
      by: 'fortran77',
    });
    const { store } = mountApp({ ids, items: { [ids[0]]: first } });

    await store.loadInitial();
    const story = stories()[0];
    const link = story.querySelector('a');
    const time = story.querySelector('time');

    expect(link.textContent).toBe('How I Became a Lock Picker');
    expect(link.href).toBe('https://www.newyorker.com/essay');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(time.dateTime).toBe('2026-10-10T13:58:53.000Z');
    expect(time.textContent).toMatch(/^10 ott 2026, \d{2}:\d{2}$/);
    expect(story.textContent).toContain('newyorker.com');
    expect(story.textContent).toContain('di fortran77');
  });

  it('un titolo con dentro dell\'HTML viene mostrato come testo', async () => {
    const tricky = rawItem(ids[0], { title: '<img src=x onerror=alert(1)> Titolo' });
    const { store } = mountApp({ ids, items: { [ids[0]]: tricky } });

    await store.loadInitial();

    expect(stories()[0].querySelector('img')).toBeNull();
    expect(stories()[0].querySelector('a').textContent).toBe('<img src=x onerror=alert(1)> Titolo');
  });

  it('mostra il pulsante Load more e il contatore', async () => {
    const { store } = mountApp({ ids });

    await store.loadInitial();

    expect(find('load-more').hidden).toBe(false);
    expect(find('load-more').textContent).toBe('Load more');
    expect(find('counter').textContent).toBe('10 notizie su 500');
  });
});

describe('Load more', () => {
  it('aggiunge le 10 news successive sotto quelle già presenti', async () => {
    const ids = makeIds(500);
    const { http, store } = mountApp({ ids });
    await store.loadInitial();
    const firstRow = stories()[0];

    await click(find('load-more'), store);

    expect(stories()).toHaveLength(20);
    expect(stories()[0]).toBe(firstRow);
    expect(stories()[10].querySelector('a').textContent).toBe(`Notizia ${ids[10]}`);
    expect(itemCalls(http)).toHaveLength(20);
    expect(http.get).toHaveBeenCalledWith(`/item/${ids[19]}.json`);
    expect(find('counter').textContent).toBe('20 notizie su 500');
  });

  it('non richiede la lista degli id una seconda volta', async () => {
    const { http, store } = mountApp({ ids: makeIds(500) });
    await store.loadInitial();

    await click(find('load-more'), store);

    const listCalls = http.get.mock.calls.filter(([path]) => path === '/newstories.json');
    expect(listCalls).toHaveLength(1);
  });

  it('mentre carica mostra i segnaposto e blocca il pulsante', async () => {
    const { store } = mountApp({ ids: makeIds(500) });
    await store.loadInitial();

    find('load-more').click();

    expect(skeletons()).toHaveLength(10);
    expect(find('load-more').getAttribute('aria-disabled')).toBe('true');
    expect(find('load-more').textContent).toBe('Carico...');

    await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
    expect(find('load-more').getAttribute('aria-disabled')).toBe('false');
  });

  it('sparisce quando le news sono finite', async () => {
    const { store } = mountApp({ ids: makeIds(15) });
    await store.loadInitial();

    await click(find('load-more'), store);

    expect(stories()).toHaveLength(15);
    expect(find('load-more').hidden).toBe(true);
    expect(find('counter').textContent).toContain('tutte le 15 notizie');
  });
});

describe('errori', () => {
  it('se la lista non arriva mostra il messaggio e Riprova fa ripartire tutto', async () => {
    const ids = makeIds(500);
    const { http, store } = mountApp({ ids });
    http.get.mockRejectedValueOnce(new Error('rete assente'));

    await store.loadInitial();

    expect(find('feedback').hidden).toBe(false);
    expect(find('feedback-text').textContent).toContain('Non riesco a caricare le notizie');
    expect(stories()).toHaveLength(0);

    await click(find('retry'), store);

    expect(find('feedback').hidden).toBe(true);
    expect(stories()).toHaveLength(10);
  });

  it('se un Load more fallisce le news già caricate restano in pagina', async () => {
    const ids = makeIds(500);
    const { store } = mountApp({ ids, failing: ids.slice(10, 20) });
    await store.loadInitial();

    await click(find('load-more'), store);

    expect(stories()).toHaveLength(10);
    expect(find('feedback').hidden).toBe(false);
    expect(find('feedback-text').textContent).toContain('Le notizie successive');
    expect(find('load-more').hidden).toBe(true);
  });

  it('se fallisce una sola news su 10 mostra le altre 9', async () => {
    const ids = makeIds(500);
    const { store } = mountApp({ ids, failing: [ids[3]] });

    await store.loadInitial();

    expect(stories()).toHaveLength(9);
    expect(find('feedback').hidden).toBe(true);
  });

  it('con una lista vuota avvisa che non ci sono notizie', async () => {
    const { store } = mountApp({ ids: [] });

    await store.loadInitial();

    expect(find('feedback-text').textContent).toContain('non ci sono notizie');
    expect(find('retry').hidden).toBe(true);
    expect(find('load-more').hidden).toBe(true);
  });
});

describe('aggiorna e tempo relativo', () => {
  it('Aggiorna svuota l\'elenco e ricarica le prime 10 news', async () => {
    const { http, store } = mountApp({ ids: makeIds(500) });
    await store.loadInitial();
    await click(find('load-more'), store);

    await click(find('refresh'), store);

    const listCalls = http.get.mock.calls.filter(([path]) => path === '/newstories.json');
    expect(listCalls).toHaveLength(2);
    expect(stories()).toHaveLength(10);
    expect(find('counter').textContent).toBe('10 notizie su 500');
  });

  it('aggiorna la scritta "fa" delle news già in pagina', async () => {
    const { store, view } = mountApp({ ids: makeIds(500) });
    await store.loadInitial();

    view.updateRelativeTimes(new Date('2026-10-10T14:28:53Z'));
    expect(stories()[0].querySelector('[data-js="relative-time"]').textContent).toBe('30 min fa');

    view.updateRelativeTimes(new Date('2026-10-10T16:58:53Z'));
    expect(stories()[0].querySelector('[data-js="relative-time"]').textContent).toBe('3 h fa');
  });

  it('avvisa gli screen reader quando il caricamento è finito', async () => {
    const { store } = mountApp({ ids: makeIds(500) });

    await store.loadInitial();

    expect(find('status').textContent).toBe('Notizie caricate: 10 su 500.');
  });
});
