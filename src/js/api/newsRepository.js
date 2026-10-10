import { toStory } from '../utils/story.js';

// Repository: è l'unico modulo che conosce gli endpoint di Hacker News
// e la forma dei dati che restituiscono. Il resto dell'app riceve
// oggetti "story" già puliti.
// Il client HTTP arriva da fuori: nell'app è axios, nei test un oggetto finto.
export function createNewsRepository(http) {
  async function getNewStoryIds() {
    const { data } = await http.get('/newstories.json');
    return Array.isArray(data) ? data : [];
  }

  async function getStory(id) {
    const { data } = await http.get(`/item/${id}.json`);
    return toStory(data);
  }

  // Le richieste partono tutte insieme. Se una fallisce tengo le altre,
  // se falliscono tutte rilancio l'errore.
  async function getStories(ids) {
    const results = await Promise.allSettled(ids.map((id) => getStory(id)));
    const failed = results.filter((result) => result.status === 'rejected');

    if (ids.length > 0 && failed.length === ids.length) {
      throw failed[0].reason;
    }

    return results
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value);
  }

  return { getNewStoryIds, getStory, getStories };
}
