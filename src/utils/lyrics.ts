export type LyricLine = { timeMs: number; text: string };

const timestampPattern = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

export function parseLrc(contents: string): LyricLine[] {
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/);
  let offsetMs = 0;
  for (const line of lines) {
    const offset = /^\[offset:([+-]?\d+)\]$/i.exec(line.trim());
    if (offset) {
      offsetMs = Number(offset[1]);
    }
  }

  const parsed: LyricLine[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) {
      continue;
    }
    timestampPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    const times: number[] = [];
    while ((match = timestampPattern.exec(line)) !== null) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      if (seconds > 59) {
        continue;
      }
      const fraction = match[3] ?? '';
      const fractionMs = Number((fraction + '000').slice(0, 3));
      times.push((minutes * 60 + seconds) * 1000 + fractionMs + offsetMs);
    }
    for (const timeMs of times) {
      if (timeMs >= 0) {
        parsed.push({ timeMs, text });
      }
    }
  }
  return parsed.sort((left, right) => left.timeMs - right.timeMs);
}

export function currentLyricIndex(
  lines: LyricLine[],
  positionSeconds: number,
): number {
  const targetMs = Math.max(0, positionSeconds * 1000);
  let low = 0;
  let high = lines.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].timeMs <= targetMs) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}
