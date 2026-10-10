import { PAGE_SIZE } from '../config.js';
import { getPage, hasNextPage } from '../utils/pagination.js';

export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADING_MORE: 'loadingMore',
  READY: 'ready',
  ERROR: 'error',
};

export function hasMore(state) {
  return hasNextPage(state.ids.length, state.cursor);
}

// Store con pattern Observer: tiene lo stato dell'app e avvisa chi si è
// iscritto ogni volta che lo stato cambia. Non sa nulla del DOM.
export function createNewsStore({ repository, pageSize = PAGE_SIZE }) {
  let state = {
    status: STATUS.IDLE,
    ids: [], // tutti gli id restituiti da newstories
    stories: [], // le news caricate finora
    cursor: 0, // quanti id ho già usato
  };

  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(changes) {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener(state));
  }

  // restituisce la funzione per annullare l'iscrizione
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function isBusy() {
    return state.status === STATUS.LOADING || state.status === STATUS.LOADING_MORE;
  }

  async function loadNextPage() {
    const pageIds = getPage(state.ids, state.cursor, pageSize);
    const stories = await repository.getStories(pageIds);

    setState({
      status: STATUS.READY,
      stories: [...state.stories, ...stories],
      cursor: state.cursor + pageIds.length,
    });
  }

  // Primo caricamento: prende la lista degli id e subito dopo le prime news.
  // Serve anche per ripartire da capo con il pulsante Aggiorna.
  async function loadInitial() {
    if (isBusy()) return;

    setState({ status: STATUS.LOADING, ids: [], stories: [], cursor: 0 });

    try {
      const ids = await repository.getNewStoryIds();
      setState({ ids });
      await loadNextPage();
    } catch {
      setState({ status: STATUS.ERROR });
    }
  }

  async function loadMore() {
    if (isBusy() || !hasMore(state)) return;

    setState({ status: STATUS.LOADING_MORE });

    try {
      await loadNextPage();
    } catch {
      // il cursore non si è mosso: con Riprova si richiede lo stesso blocco
      setState({ status: STATUS.ERROR });
    }
  }

  function retry() {
    return state.ids.length === 0 ? loadInitial() : loadMore();
  }

  return { getState, subscribe, loadInitial, loadMore, retry };
}
