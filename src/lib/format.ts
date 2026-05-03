const czk0 = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

const num0 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });

export function formatCZK(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return czk0.format(Math.round(value));
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return num0.format(Math.round(value));
}

export function formatPercent(value: number, decimals: number = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatYears(value: number): string {
  const n = Math.round(value);
  if (n === 1) return "1 rok";
  if (n >= 2 && n <= 4) return `${n} roky`;
  return `${n} let`;
}
