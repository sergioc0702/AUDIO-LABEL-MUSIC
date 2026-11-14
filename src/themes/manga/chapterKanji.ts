/** Chapter numbers the way a manga prints them: 第十二話. */
export function chapterKanji(n: number) {
  const digits = '〇一二三四五六七八九';
  const tens = Math.floor(n / 10) % 10;
  const hundreds = Math.floor(n / 100);
  const ones = n % 10;
  let text = hundreds > 1 ? digits[hundreds % 10] : '';
  if (hundreds > 0) text += '百';
  if (tens > 1) text += digits[tens];
  if (tens > 0) text += '十';
  if (ones > 0 || n === 0) text += digits[ones];
  return `第${text}話`;
}
