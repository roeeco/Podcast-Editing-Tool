export type TextDirection = 'rtl' | 'ltr';

export const getTextDirection = (
  text: string,
  fallback: TextDirection = 'rtl'
): TextDirection => {
  for (const character of text) {
    if (/[\u0590-\u08FF]/.test(character)) {
      return 'rtl';
    }

    if (/[A-Za-z\u00C0-\u02AF]/.test(character)) {
      return 'ltr';
    }
  }

  return fallback;
};

export const getTextAlignment = (
  text: string,
  fallback: TextDirection = 'rtl'
): 'left' | 'right' => {
  return getTextDirection(text, fallback) === 'ltr'
    ? 'left'
    : 'right';
};
