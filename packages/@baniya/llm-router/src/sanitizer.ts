import { PATTERNS } from '@baniya/data-classifier';

const sanitizerStore = new Map<string, Map<string, string>>();

export function sanitize(requestId: string, text: string, detectedPatterns: string[]): string {
  const map = new Map<string, string>();
  let sanitized = text;

  for (const patternName of detectedPatterns) {
    if (patternName.startsWith('key:')) continue;
    const regex = PATTERNS[patternName];
    if (!regex) continue;

    const r = new RegExp(regex.source, regex.flags);
    let matchIndex = 0;
    sanitized = sanitized.replace(r, (match) => {
      matchIndex++;
      const placeholder = `[${patternName.toUpperCase()}_${matchIndex}]`;
      map.set(placeholder, match);
      return placeholder;
    });
  }

  sanitizerStore.set(requestId, map);
  return sanitized;
}

export function restore(requestId: string, text: string): string {
  const map = sanitizerStore.get(requestId);
  if (!map) return text;

  let restored = text;
  for (const [placeholder, original] of map.entries()) {
    restored = restored.replaceAll(placeholder, original);
  }

  clear(requestId);
  return restored;
}

export function clear(requestId: string): void {
  sanitizerStore.delete(requestId);
}
