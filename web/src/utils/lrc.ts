import { LyricLine } from '../types/music';

export function parseLrc(lrcText: string | undefined | null): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const tagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(tagRegex)];
    if (matches.length > 0) {
      const text = line.replace(tagRegex, '').trim();
      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        let ms = 0;
        if (match[3]) {
          const rawMs = match[3];
          ms = rawMs.length === 1 ? parseInt(rawMs, 10) * 100 : (rawMs.length === 2 ? parseInt(rawMs, 10) * 10 : parseInt(rawMs, 10));
        }
        const time = mins * 60 + secs + ms / 1000;
        result.push({ time, text });
      }
    }
  }
  result.sort((a, b) => (a.time || 0) - (b.time || 0));
  return result;
}

export function parsePlainLyrics(plainText: string | undefined | null, duration: number = 180): LyricLine[] {
  if (!plainText) return [];
  const rawLines = plainText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length === 0) return [];
  const step = Math.max(2, (duration * 0.95) / rawLines.length);
  return rawLines.map((text, i) => ({
    time: Math.floor(i * step),
    text
  }));
}

