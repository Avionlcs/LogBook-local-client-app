import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InsufficientPermissionsComponent } from './insufficient-permissions/insufficient-permissions.component';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, InsufficientPermissionsComponent],
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss'
})
export class ErrorComponent {
  @Input() error: any = {};
}
