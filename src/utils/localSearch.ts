/** Ephemeral browser-only index. Callers decide which public or unlocked data may enter it. */
const normalize = (value: string) => value.toLocaleLowerCase("de").replace(/ß/g, "ss").normalize("NFD").replace(/\p{M}/gu, "");
const words = (value: string) => value.match(/[\p{L}\p{N}]+/gu) ?? [];
type SearchField = { text: string; weight: number };
type IndexedField = { text: string; weight: number; words: string[] };

export const createLocalSearchIndex = <T,>(items: T[], fields: (item: T) => SearchField[]) => items.map((item, order) => ({
  item, order, fields: fields(item).map(({ text, weight }): IndexedField => {
    const normalized = normalize(text);
    return { text: normalized, weight, words: Array.from(new Set(words(normalized))) };
  }),
}));

// Bounded Damerau-Levenshtein also recognises transposed letters ("Anaylse").
const closeWord = (left: string, right: string, limit: number) => {
  if (Math.abs(left.length - right.length) > limit) return false;
  const rows = [Array.from({ length: right.length + 1 }, (_, index) => index)];
  for (let i = 1; i <= left.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= right.length; j += 1) {
      row[j] = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + Number(left[i - 1] !== right[j - 1]));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) row[j] = Math.min(row[j], rows[i - 2][j - 2] + 1);
    }
    if (Math.min(...row) > limit) return false;
    rows.push(row);
  }
  return rows[left.length][right.length] <= limit;
};

export const searchLocalIndex = <T,>(index: ReturnType<typeof createLocalSearchIndex<T>>, query: string) => {
  const terms = Array.from(query.matchAll(/(-?)"([^"]+)"|(-?)([^\s"]+)/g)).map((match) => ({
    excluded: (match[1] || match[3]) === "-", phrase: Boolean(match[2]), text: normalize(match[2] || match[4]),
  })).filter((term) => term.text && term.text !== "-");
  const cache = new Map<string, boolean>();
  const matchScore = (field: IndexedField, term: typeof terms[number]) => {
    if (term.phrase) return field.text.includes(term.text) ? field.weight * 2 : 0;
    if (field.words.includes(term.text)) return field.weight;
    if (field.words.some((word) => word.startsWith(term.text))) return field.weight * 0.8;
    if (field.text.includes(term.text)) return field.weight * 0.6;
    if (term.excluded || term.text.length < 4 || term.text.length > 48) return 0;
    const limit = term.text.length >= 9 ? 2 : 1;
    return field.words.some((word) => {
      const key = `${term.text}:${word}`;
      if (!cache.has(key)) cache.set(key, closeWord(term.text, word, limit));
      return cache.get(key);
    }) ? field.weight * 0.3 : 0;
  };
  return index.flatMap((entry) => {
    let score = 0;
    for (const term of terms) {
      const best = Math.max(0, ...entry.fields.map((field) => matchScore(field, term)));
      if (term.excluded ? best > 0 : best === 0) return [];
      if (!term.excluded) score += best;
    }
    return [{ item: entry.item, score, order: entry.order }];
  }).sort((a, b) => b.score - a.score || a.order - b.order);
};
