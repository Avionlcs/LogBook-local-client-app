export function normalizeFormula(expr: string): string {
  // remove spaces
  const clean = expr.replace(/\s+/g, '');

  // split by + or - but keep the operator
  const parts = clean.split(/([+-])/).filter(Boolean);

  // wrap non-operator parts with parentheses and add spacing around operators
  return parts
    .map(part => {
      if (part === '+' || part === '-') {
        return ` ${part} `;
      }
      return `(${part})`;
    })
    .join('');
}
