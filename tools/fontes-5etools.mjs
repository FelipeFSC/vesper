// Os registros do 5etools usam `source`, que nem sempre coincide com o `id`
// de books.json/adventures.json (por exemplo, PSA e PS-A).
export function sourceNames(entries) {
  const names = new Map();
  for (const entry of entries) {
    if (entry.source && entry.name && !names.has(entry.source)) names.set(entry.source, entry.name);
  }
  for (const entry of entries) {
    if (entry.id && entry.name && !names.has(entry.id)) names.set(entry.id, entry.name);
  }
  for (const entry of entries) {
    if (entry.parentSource && entry.parentName && !names.has(entry.parentSource)) names.set(entry.parentSource, entry.parentName);
  }
  return (source) => names.get(source) || globalThis.Parser?.SOURCE_JSON_TO_FULL?.[source] || source;
}
