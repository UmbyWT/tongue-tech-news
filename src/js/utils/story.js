import { get } from 'lodash-es';
import { HN_ITEM_URL } from '../config.js';
import { fromUnixSeconds } from './date.js';

export function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// "https://www.example.com/post/1" -> "example.com"
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Trasforma la risposta grezza dell'API nell'oggetto usato dall'app.
// Restituisce null se la news non si può mostrare (cancellata, senza titolo...).
export function toStory(raw) {
  const id = get(raw, 'id');
  const rawTitle = get(raw, 'title');
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

  if (!id || !title || get(raw, 'deleted') || get(raw, 'dead')) {
    return null;
  }

  const discussionUrl = `${HN_ITEM_URL}${id}`;
  const externalUrl = get(raw, 'url', '');
  // i post "Ask HN" non hanno un link: in quel caso porto alla discussione.
  // Stessa cosa se il link non è http o https (es. javascript:...)
  const url = isHttpUrl(externalUrl) ? externalUrl : discussionUrl;

  return {
    id,
    title,
    url,
    domain: getDomain(url),
    author: get(raw, 'by', ''),
    publishedAt: fromUnixSeconds(get(raw, 'time')),
  };
}
