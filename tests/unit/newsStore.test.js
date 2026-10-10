import { describe, it, expect, vi } from 'vitest';
import { createNewsStore, hasMore, STATUS } from '../../src/js/store/newsStore.js';
import { createFakeRepository, makeIds } from '../helpers/fakes.js';

function setup(count = 500) {
  const ids = makeIds(count);
  const repository = createFakeRepository(ids);
  const store = createNewsStore({ repository });
  return { ids, repository, store };
}

describe('createNewsStore', () => {
  it('parte vuoto e in attesa', () => {
    const { store } = setup();

    expect(store.getState()).toEqual({ status: STATUS.IDLE, ids: [], stories: [], cursor: 0 });
  });

  describe('loadInitial', () => {
    it('carica la lista degli id e chiede il dettaglio solo dei primi 10', async () => {
      const { ids, repository, store } = setup();

      await store.loadInitial();

      expect(repository.getNewStoryIds).toHaveBeenCalledTimes(1);
      expect(repository.getStories).toHaveBeenCalledTimes(1);
      expect(repository.getStories).toHaveBeenCalledWith(ids.slice(0, 10));
    });

    it('alla fine lo stato contiene 10 news su 500', async () => {
      const { ids, store } = setup();

      await store.loadInitial();
      const state = store.getState();

      expect(state.status).toBe(STATUS.READY);
      expect(state.ids).toHaveLength(500);
      expect(state.stories.map((story) => story.id)).toEqual(ids.slice(0, 10));
      expect(state.cursor).toBe(10);
    });

    it('va in errore se la lista degli id non arriva', async () => {
      const { repository, store } = setup();
      repository.getNewStoryIds.mockRejectedValueOnce(new Error('rete assente'));

      await store.loadInitial();

      expect(store.getState().status).toBe(STATUS.ERROR);
      expect(store.getState().stories).toEqual([]);
    });

    it('chiamato una seconda volta riparte da capo', async () => {
      const { store } = setup();

      await store.loadInitial();
      await store.loadMore();
      await store.loadInitial();

      expect(store.getState().stories).toHaveLength(10);
      expect(store.getState().cursor).toBe(10);
    });
  });

  describe('loadMore', () => {
    it('chiede i 10 id successivi e aggiunge le news in coda', async () => {
      const { ids, repository, store } = setup();

      await store.loadInitial();
      await store.loadMore();

      expect(repository.getStories).toHaveBeenLastCalledWith(ids.slice(10, 20));
      expect(store.getState().stories.map((story) => story.id)).toEqual(ids.slice(0, 20));
      expect(store.getState().cursor).toBe(20);
    });

    it('non fa partire due caricamenti insieme se si clicca due volte', async () => {
      const { repository, store } = setup();
      await store.loadInitial();

      await Promise.all([store.loadMore(), store.loadMore()]);

      expect(repository.getStories).toHaveBeenCalledTimes(2);
      expect(store.getState().stories).toHaveLength(20);
    });

    it('l\'ultimo blocco contiene solo le news rimaste, poi si ferma', async () => {
      const { repository, store } = setup(25);

      await store.loadInitial();
      await store.loadMore();
      await store.loadMore();

      expect(store.getState().stories).toHaveLength(25);
      expect(hasMore(store.getState())).toBe(false);

      await store.loadMore();
      expect(repository.getStories).toHaveBeenCalledTimes(3);
    });

    it('se il blocco fallisce tiene le news già caricate e non sposta il cursore', async () => {
      const { repository, store } = setup();
      await store.loadInitial();
      repository.getStories.mockRejectedValueOnce(new Error('rete assente'));

      await store.loadMore();

      expect(store.getState().status).toBe(STATUS.ERROR);
      expect(store.getState().stories).toHaveLength(10);
      expect(store.getState().cursor).toBe(10);
    });
  });

  describe('retry', () => {
    it('dopo un errore sulla lista rifà il primo caricamento', async () => {
      const { repository, store } = setup();
      repository.getNewStoryIds.mockRejectedValueOnce(new Error('rete assente'));
      await store.loadInitial();

      await store.retry();

      expect(store.getState().status).toBe(STATUS.READY);
      expect(store.getState().stories).toHaveLength(10);
    });

    it('dopo un errore su Load more richiede lo stesso blocco', async () => {
      const { ids, repository, store } = setup();
      await store.loadInitial();
      repository.getStories.mockRejectedValueOnce(new Error('rete assente'));
      await store.loadMore();

      await store.retry();

      expect(repository.getStories).toHaveBeenLastCalledWith(ids.slice(10, 20));
      expect(store.getState().stories).toHaveLength(20);
    });
  });

  describe('subscribe', () => {
    it('avvisa gli iscritti a ogni cambio di stato', async () => {
      const { store } = setup();
      const statuses = [];
      store.subscribe((state) => statuses.push(state.status));

      await store.loadInitial();
      await store.loadMore();

      expect(statuses).toEqual([
        STATUS.LOADING,
        STATUS.LOADING, // arrivati gli id
        STATUS.READY,
        STATUS.LOADING_MORE,
        STATUS.READY,
      ]);
    });

    it('smette di avvisare chi annulla l\'iscrizione', async () => {
      const { store } = setup();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      await store.loadInitial();

      expect(listener).not.toHaveBeenCalled();
    });

    it('avvisa tutti gli iscritti', async () => {
      const { store } = setup();
      const first = vi.fn();
      const second = vi.fn();
      store.subscribe(first);
      store.subscribe(second);

      await store.loadInitial();

      expect(first).toHaveBeenCalledTimes(3);
      expect(second).toHaveBeenCalledTimes(3);
    });
  });
});

describe('hasMore', () => {
  it('confronta il cursore con il numero di id', () => {
    expect(hasMore({ ids: makeIds(500), cursor: 10 })).toBe(true);
    expect(hasMore({ ids: makeIds(500), cursor: 500 })).toBe(false);
    expect(hasMore({ ids: [], cursor: 0 })).toBe(false);
  });
});
