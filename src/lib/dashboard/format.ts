/** Formats a rupee amount with Indian digit grouping (e.g. 1,23,45,678). */
export function formatInr(n: number, decimals = 2, masked = false): string {
  if (masked) return '₹ ••••••';
  const negative = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${negative ? '-₹' : '₹'}${grouped}${decPart ? `.${decPart}` : ''}`;
}
