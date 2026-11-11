export function hasTelugu(value: string) {
  return /[\u0C00-\u0C7F]/.test(value);
}

export function splitLabel(splitBy: "outline" | "headings" | "pages") {
  if (splitBy === "outline") return "bookmarks";
  if (splitBy === "headings") return "headings";
  return "pages";
}
