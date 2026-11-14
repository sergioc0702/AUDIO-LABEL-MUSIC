/**
 * The pieces of the Bloques theme. Twenty-five pieces of four cells fill a
 * 10×10 board, two rows at a time from the bottom, so the cover is complete
 * exactly when the song ends.
 */
export const BOARD_CELLS = 10;
const PIECES_PER_BAND = 5;

/** A cell as [column, row], both 0–9, row 0 at the top. */
export type Cell = [number, number];

function band(index: number): Cell[][] {
  const top = BOARD_CELLS - 2 - index * 2;
  const bottom = top + 1;
  // Every other band is mirrored, so the stack does not look repetitive.
  const col = (c: number) => (index % 2 === 1 ? BOARD_CELLS - 1 - c : c);
  return [
    // a square
    [
      [col(0), top],
      [col(1), top],
      [col(0), bottom],
      [col(1), bottom],
    ],
    // an L
    [
      [col(2), bottom],
      [col(3), bottom],
      [col(4), bottom],
      [col(2), top],
    ],
    // a J
    [
      [col(3), top],
      [col(4), top],
      [col(5), top],
      [col(5), bottom],
    ],
    // two straight bars
    [
      [col(6), bottom],
      [col(7), bottom],
      [col(8), bottom],
      [col(9), bottom],
    ],
    [
      [col(6), top],
      [col(7), top],
      [col(8), top],
      [col(9), top],
    ],
  ];
}

export const blockPieces: Cell[][] = Array.from(
  { length: BOARD_CELLS / 2 },
  (_, i) => band(i),
).flat();

/** How many pieces have landed for a song this far along (0–1). */
export function piecesLanded(progress: number) {
  const share = Math.min(1, Math.max(0, progress));
  return Math.min(blockPieces.length, Math.floor(share * blockPieces.length));
}

/** Full rows so far: every five pieces complete two rows. */
export function rowsCompleted(landed: number) {
  return Math.floor(landed / PIECES_PER_BAND) * 2;
}
