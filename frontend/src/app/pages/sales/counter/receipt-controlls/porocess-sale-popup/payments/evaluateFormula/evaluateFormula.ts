import { normalizeFormula } from "./normalizeFormula";

export function evaluateFormula(expr: string): { value: number | null; displayValue: any } {
    try {
        // Only allow digits, math operators, decimals, parentheses, and spaces
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
            return { value: null, displayValue: expr };
        }

        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${expr}`)();

        if (typeof result === 'number' && !isNaN(result)) {
            // Check if expr is plain number (int or float)
            if (/^\d+(\.\d+)?$/.test(expr.trim())) {
                return { value: result, displayValue: '' }; // number only
            } else {
                return { value: result, displayValue: normalizeFormula(expr) };   // formula
            }
        }

        return { value: null, displayValue: normalizeFormula(expr) };
    } catch {
        return { value: null, displayValue: normalizeFormula(expr) };
    }
}
