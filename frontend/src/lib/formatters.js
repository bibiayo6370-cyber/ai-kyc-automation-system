export function formatDate(value, { dateOnly = false } = {}) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", dateOnly
    ? { day: "2-digit", month: "short", year: "numeric" }
    : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  ).format(date);
}

export function formatLabel(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFileSize(value) {
  if (typeof value !== "number") return "—";
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}