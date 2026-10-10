import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto-condensed/latin-700.css';
import '@fontsource/roboto-condensed/latin-900.css';
import '../css/style.css';

import { httpClient } from './api/httpClient.js';
import { createNewsRepository } from './api/newsRepository.js';
import { createNewsStore } from './store/newsStore.js';
import { createNewsView } from './ui/newsView.js';

const ONE_MINUTE = 60 * 1000;

// Qui si montano i pezzi: API -> repository -> store -> vista
const repository = createNewsRepository(httpClient);
const store = createNewsStore({ repository });

const view = createNewsView(document, {
  onLoadMore: store.loadMore,
  onRetry: store.retry,
  onRefresh: store.loadInitial,
});

store.subscribe(view.render);
store.loadInitial();

setInterval(() => view.updateRelativeTimes(), ONE_MINUTE);
