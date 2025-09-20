import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-change-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './change-mode.component.html',
  styleUrl: './change-mode.component.scss'
})
export class ChangeModeComponent {
  @Input() activated: boolean = false;
  @Output() displayModeChange = new EventEmitter<boolean>();

 changeMode() {
     this.displayModeChange.emit(!this.activated);
  }
}
