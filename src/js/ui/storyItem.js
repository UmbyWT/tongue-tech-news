import { formatDateTime, formatRelativeTime } from '../utils/date.js';

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// Uso sempre textContent e mai innerHTML: i titoli arrivano da un servizio
// esterno e non devono poter inserire HTML nella pagina.
export function createStoryItem(story, now = new Date()) {
  const item = createElement('li', 'story');

  const ago = createElement('p', 'story__ago', formatRelativeTime(story.publishedAt, now));
  ago.dataset.js = 'relative-time';
  if (story.publishedAt) ago.dataset.time = story.publishedAt.toISOString();

  const body = createElement('div', 'story__body');

  const title = createElement('h2', 'story__title');
  const link = createElement('a', 'story__link', story.title);
  link.href = story.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  title.append(link);

  const meta = createElement('p', 'story__meta');

  const date = createElement('time', 'story__date', formatDateTime(story.publishedAt));
  if (story.publishedAt) date.dateTime = story.publishedAt.toISOString();
  meta.append(date);

  if (story.domain) meta.append(createElement('span', 'story__domain', story.domain));
  if (story.author) meta.append(createElement('span', 'story__author', `di ${story.author}`));

  body.append(title, meta);
  item.append(ago, body);
  return item;
}

// Riga grigia mostrata mentre i dati stanno arrivando
export function createSkeletonItem() {
  const item = createElement('li', 'story story--skeleton');
  item.setAttribute('aria-hidden', 'true');
  item.dataset.js = 'skeleton';

  const body = createElement('div', 'story__body');
  body.append(
    createElement('span', 'skeleton skeleton--title'),
    createElement('span', 'skeleton skeleton--meta')
  );

  item.append(createElement('span', 'skeleton skeleton--ago'), body);
  return item;
}
