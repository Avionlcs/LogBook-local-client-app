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
    console.log(event, "LLLLLLLLLLLLLLLLLLL");
    if (!event.altKey) {
      return;
    }
    if (event.key.toLowerCase() === 's') {
      event.preventDefault(); 
      this.changeMode();
    }
  }
}
