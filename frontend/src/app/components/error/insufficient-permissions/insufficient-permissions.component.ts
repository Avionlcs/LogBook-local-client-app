import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-insufficient-permissions',
  standalone: true,
  imports: [],
  templateUrl: './insufficient-permissions.component.html',
  styleUrl: './insufficient-permissions.component.scss'
})
export class InsufficientPermissionsComponent {
  @Input() error: any = {};
}
