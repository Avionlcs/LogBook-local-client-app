import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl } from '@angular/forms';

@Directive({
  standalone: true,
  selector: '[appPasswordStrength]',
  providers: [{ provide: NG_VALIDATORS, useExisting: PasswordStrengthDirective, multi: true }]
})
export class PasswordStrengthDirective implements Validator {
  validate(control: AbstractControl): { [key: string]: boolean } | null {
    const value = control.value || '';
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z0-9]/.test(value);
    const isLongEnough = value.length >= 8;
    const valid = isLongEnough && [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length >= 3;
    return valid ? null : { weakPassword: true };
  }
}