// src/app/features/inventory-reports/utils/validation.service.ts
import { Injectable } from '@angular/core';

@Injectable()
export class ValidationService {
  isItemValid(item: any): boolean {
    const validationSchema: { [key: string]: any } = {
      name: { type: 'string', min: 2, max: 100, required: true },
      stock: { type: 'number', min: 0, required: true },
      min_stock: { type: 'number', min: 0, required: true },
      buy_price: { type: 'number', min: 0, required: true },
      sale_price: { type: 'number', min: 0, required: true }
    };

    const isValidDate = (value: string): boolean => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
      return dateRegex.test(value);
    };

    for (const [key, rules] of Object.entries(validationSchema)) {
      const value = item[key];

      if (rules.required && (value === undefined || value === null || value === '')) {
        return false;
      }

      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      if (rules.type === 'number') {
        const numValue = parseFloat(value as string);
        if (isNaN(numValue)) {
          return false;
        }
        if (rules.min !== undefined && numValue < rules.min) {
          return false;
        }
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        return false;
      }

      if (rules.type === 'string' && key === 'name') {
        if (typeof value === 'string') {
          if (rules.min !== undefined && value.length < rules.min) {
            return false;
          }
          if ('max' in rules && value.length > rules.max) {
            return false;
          }
        }
      }

      if (rules.pattern === 'date' && value && !isValidDate(value)) {
        return false;
      }
    }

    return true;
  }
}