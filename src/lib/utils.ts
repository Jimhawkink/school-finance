export const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '-';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${formatted})` : formatted;
};

export const sum = (arr: number[]): number =>
  arr.reduce((a, b) => a + (Number(b) || 0), 0);

export const pct = (actual: number, budget: number): number =>
  budget === 0 ? 0 : Math.round((actual / budget) * 100);

export const cls = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

export const numVal = (v: string): number => {
  const clean = v.replace(/,/g, '').replace(/\(/g, '-').replace(/\)/g, '');
  return isNaN(Number(clean)) ? 0 : Number(clean);
};
