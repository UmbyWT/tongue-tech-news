import { PAGE_SIZE } from '../config.js';
import { STATUS, hasMore } from '../store/newsStore.js';
import { formatRelativeTime } from '../utils/date.js';
import { createStoryItem, createSkeletonItem } from './storyItem.js';

const MESSAGES = {
  listError: 'Non riesco a caricare le notizie. Controlla la connessione e riprova.',
  pageError: 'Le notizie successive non si sono caricate. Riprova tra un attimo.',
  empty: 'In questo momento non ci sono notizie da mostrare.',
};

// La vista riceve lo stato e aggiorna il DOM. Non chiama le API e non
// decide cosa caricare: quando l'utente clicca avvisa chi l'ha creata.
export function createNewsView(root, { onLoadMore, onRetry, onRefresh }) {
  const find = (name) => root.querySelector(`[data-js="${name}"]`);

  const list = find('news-list');
  const status = find('status');
  const feedback = find('feedback');
  const feedbackText = find('feedback-text');
  const retryButton = find('retry');
  const loadMoreButton = find('load-more');
  const counter = find('counter');
  const refreshButton = find('refresh');

  let renderedStories = 0;
  let previousStatus = null;

  loadMoreButton.addEventListener('click', () => onLoadMore());
  retryButton.addEventListener('click', () => onRetry());
  refreshButton.addEventListener('click', () => onRefresh());

  function removeSkeletons() {
    list.querySelectorAll('[data-js="skeleton"]').forEach((item) => item.remove());
  }

  function renderStories(stories) {
    // dopo Aggiorna la lista riparte da zero
    if (stories.length < renderedStories) {
      list.replaceChildren();
      renderedStories = 0;
    }

    // aggiungo solo le news nuove, quelle già in pagina non le tocco
    const now = new Date();
    const newItems = stories.slice(renderedStories).map((story) => createStoryItem(story, now));
    list.append(...newItems);
    renderedStories = stories.length;
  }

  function renderSkeletons(isLoading) {
    removeSkeletons();
    if (!isLoading) return;

    const skeletons = Array.from({ length: PAGE_SIZE }, createSkeletonItem);
    list.append(...skeletons);
  }

  function renderFeedback(state) {
    const isError = state.status === STATUS.ERROR;
    const isEmpty = state.status === STATUS.READY && state.stories.length === 0;

    feedback.hidden = !isError && !isEmpty;
    retryButton.hidden = !isError;

    if (isError) {
      feedbackText.textContent = state.stories.length === 0 ? MESSAGES.listError : MESSAGES.pageError;
    } else if (isEmpty) {
      feedbackText.textContent = MESSAGES.empty;
    }
  }

  function renderControls(state) {
    const isLoadingMore = state.status === STATUS.LOADING_MORE;
    const canLoadMore = hasMore(state) && (state.status === STATUS.READY || isLoadingMore);

    // aria-disabled al posto di disabled: il pulsante resta a fuoco per chi
    // usa la tastiera. I click doppi li scarta già lo store.
    loadMoreButton.hidden = !canLoadMore;
    loadMoreButton.setAttribute('aria-disabled', String(isLoadingMore));
    loadMoreButton.textContent = isLoadingMore ? 'Carico...' : 'Load more';

    const isLoading = state.status === STATUS.LOADING || isLoadingMore;
    refreshButton.setAttribute('aria-disabled', String(isLoading));

    const total = state.ids.length;
    const shown = state.stories.length;

    if (shown === 0) {
      counter.textContent = '';
    } else if (hasMore(state)) {
      counter.textContent = `${shown} notizie su ${total}`;
    } else {
      counter.textContent = `Sei arrivato in fondo: hai visto tutte le ${shown} notizie disponibili.`;
    }
  }

  // Messaggio letto dagli screen reader quando finisce un caricamento
  function announce(state) {
    const wasLoading = previousStatus === STATUS.LOADING || previousStatus === STATUS.LOADING_MORE;

    if (state.status === STATUS.READY && wasLoading) {
      status.textContent = `Notizie caricate: ${state.stories.length} su ${state.ids.length}.`;
    } else if (state.status === STATUS.ERROR) {
      status.textContent = 'Caricamento non riuscito.';
    }

    previousStatus = state.status;
  }

  function render(state) {
    const isLoading = state.status === STATUS.LOADING || state.status === STATUS.LOADING_MORE;

    list.setAttribute('aria-busy', String(isLoading));
    renderSkeletons(false);
    renderStories(state.stories);
    renderSkeletons(isLoading);
    renderFeedback(state);
    renderControls(state);
    announce(state);
  }

  // "5 min fa" invecchia: main.js chiama questa funzione una volta al minuto
  function updateRelativeTimes(now = new Date()) {
    list.querySelectorAll('[data-js="relative-time"]').forEach((element) => {
      if (!element.dataset.time) return;
      element.textContent = formatRelativeTime(new Date(element.dataset.time), now);
    });
  }

  return { render, updateRelativeTimes };
}
