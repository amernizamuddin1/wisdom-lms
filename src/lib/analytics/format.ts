export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(hours * 10) / 10}h`;
}

export function formatCurrency(value: number, currencyLabel: string): string {
  if (value <= 0) return "—";
  return `${currencyLabel} ${value.toLocaleString()}`;
}
