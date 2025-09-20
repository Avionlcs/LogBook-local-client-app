import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-change-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './change-mode.component.html',
  styleUrls: ['./change-mode.component.scss']
})
export class ChangeModeComponent {
  @Input() activated: boolean = false;
  @Output() displayModeChange = new EventEmitter<boolean>();

  changeMode() {
    this.displayModeChange.emit(!this.activated);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 's' && event.shiftKey) {
      event.preventDefault(); // avoid typing "S" into inputs
      this.changeMode();
    }
  }
}
