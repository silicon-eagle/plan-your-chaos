export function parsePositiveInteger(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value;

  return typeof number === "number" &&
    Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

export function parseDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
