const JST = "Asia/Tokyo";

function dateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: JST, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: map.year, month: map.month, day: map.day };
}

function toDateKey(value: Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getToday() {
  return toDateKey(new Date());
}

export function dateKeyFromTimestamp(value: string | Date) {
  return toDateKey(typeof value === "string" ? new Date(value) : value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: JST, year: "numeric", month: "numeric", day: "numeric" }).format(new Date(`${date}T00:00:00+09:00`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: JST, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function getJstDayBounds(date: string) {
  const startDate = new Date(`${date}T00:00:00+09:00`);
  const next = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { start: `${date}T00:00:00+09:00`, end: `${toDateKey(next)}T00:00:00+09:00` };
}

export function getLastNDates(count: number) {
  const today = new Date(`${getToday()}T00:00:00+09:00`);
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(toDateKey(new Date(today.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return dates;
}
