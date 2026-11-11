export const FONT_CHOICES = [
  { id: "Georgia", label: "Serif" },
  { id: "Times New Roman", label: "Times" },
  { id: "Source Sans 3", label: "Sans" },
  { id: "Noto Serif Telugu", label: "Telugu serif" },
  { id: "Noto Sans Telugu", label: "Telugu sans" },
] as const;

export function isFontChoice(value: string) {
  return FONT_CHOICES.some((font) => font.id === value);
}

export function cssFontFamily(font: string) {
  if (font === "Noto Serif Telugu") return 'var(--font-serif-te), "Noto Serif Telugu", serif';
  if (font === "Noto Sans Telugu") return 'var(--font-sans-te), "Noto Sans Telugu", sans-serif';
  if (font === "Source Sans 3") return 'var(--font-sans-en), "Source Sans 3", sans-serif';
  if (font === "Georgia") return 'var(--font-serif-en), Georgia, "Times New Roman", serif';
  return `"${font}", serif`;
}

export function fontFromPdf(family: string, text: string) {
  if (/[\u0C00-\u0C7F]/.test(text)) return "Noto Serif Telugu";
  if (/sans/i.test(family)) return "Source Sans 3";
  return "Georgia";
}
