import { describe, it, expect } from 'vitest';
import { createNewsRepository } from '../../src/js/api/newsRepository.js';
import { createFakeHttp, rawItem } from '../helpers/fakes.js';

describe('createNewsRepository', () => {
  describe('getNewStoryIds', () => {
    it('chiama newstories e restituisce la lista degli id', async () => {
      const http = createFakeHttp({ ids: [3, 2, 1] });
      const repository = createNewsRepository(http);

      const ids = await repository.getNewStoryIds();

      expect(http.get).toHaveBeenCalledWith('/newstories.json');
      expect(ids).toEqual([3, 2, 1]);
    });

    it('restituisce una lista vuota se la risposta non è un array', async () => {
      const repository = createNewsRepository(createFakeHttp({ ids: null }));

      expect(await repository.getNewStoryIds()).toEqual([]);
    });
  });

  describe('getStory', () => {
    it('chiama il dettaglio della news e la restituisce già pulita', async () => {
      const http = createFakeHttp({ items: { 42: rawItem(42, { title: 'Titolo di prova' }) } });
      const repository = createNewsRepository(http);

      const story = await repository.getStory(42);

      expect(http.get).toHaveBeenCalledWith('/item/42.json');
      expect(story.title).toBe('Titolo di prova');
      expect(story.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('getStories', () => {
    it('fa una chiamata per ogni id e mantiene l\'ordine degli id', async () => {
      const http = createFakeHttp();
      const repository = createNewsRepository(http);

      const stories = await repository.getStories([30, 20, 10]);

      expect(http.get).toHaveBeenCalledTimes(3);
      expect(stories.map((story) => story.id)).toEqual([30, 20, 10]);
    });

    it('salta le news che l\'API restituisce come null o cancellate', async () => {
      const http = createFakeHttp({ items: { 20: null, 10: rawItem(10, { deleted: true }) } });
      const repository = createNewsRepository(http);

      const stories = await repository.getStories([30, 20, 10]);

      expect(stories.map((story) => story.id)).toEqual([30]);
    });

    it('se una sola richiesta fallisce restituisce le altre', async () => {
      const repository = createNewsRepository(createFakeHttp({ failing: [20] }));

      const stories = await repository.getStories([30, 20, 10]);

      expect(stories.map((story) => story.id)).toEqual([30, 10]);
    });

    it('se falliscono tutte le richieste lancia l\'errore', async () => {
      const repository = createNewsRepository(createFakeHttp({ failing: [30, 20, 10] }));

      await expect(repository.getStories([30, 20, 10])).rejects.toThrow('Richiesta fallita');
    });

    it('con una lista vuota non fa chiamate', async () => {
      const http = createFakeHttp();
      const repository = createNewsRepository(http);

      expect(await repository.getStories([])).toEqual([]);
      expect(http.get).not.toHaveBeenCalled();
    });
  });
});
