import { Directive, Input } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl, NgModel } from '@angular/forms';

@Directive({
  standalone: true,
  selector: '[appPasswordMatch]',
  providers: [{ provide: NG_VALIDATORS, useExisting: PasswordMatchDirective, multi: true }]
})
export class PasswordMatchDirective implements Validator {
  @Input('appPasswordMatch') password: string = '';

  validate(control: AbstractControl): { [key: string]: boolean } | null {
    const confirmPassword = control.value;
    return confirmPassword === this.password ? null : { passwordMismatch: true };
  }
}