export function newId(prefix: "book" | "sec") {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${time}${rand}`;
}

export function isSafeId(id: string) {
  return /^[a-z0-9-]{4,80}$/.test(id);
}
