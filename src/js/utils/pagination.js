// Restituisce il blocco di elementi che parte da `start`.
// L'ultimo blocco può essere più corto di `size`.
export function getPage(items, start, size) {
  if (start < 0 || size <= 0) return [];
  return items.slice(start, start + size);
}

export function hasNextPage(total, loaded) {
  return loaded < total;
}
