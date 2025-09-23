import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';
import { AriaAnnouncerService } from '../../core/shortcuts/aria-announcer.service';

@Component({
  selector: 'app-help-overlay',
  templateUrl: './help-overlay.component.html',
  styleUrls: ['./help-overlay.component.css']
})
export class HelpOverlayComponent implements OnInit, OnDestroy {
  isVisible = false;
  shortcuts: any[] = [];

  constructor(
    private shortcutsManager: CoreShortcutsManagerService,
    private announcer: AriaAnnouncerService,
    @Inject('HELP_HOTKEY') private helpHotkey: string[] = ['?']
  ) {}

  ngOnInit() {
    this.shortcutsManager.register({
      keys: this.helpHotkey,
      handler: () => this.toggleOverlay(),
      description: 'Show/hide keyboard shortcuts help'
    });
  }

  ngOnDestroy() {
    this.shortcutsManager.unregister('global', this.helpHotkey.join('+'));
  }

  toggleOverlay() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.shortcuts = this.shortcutsManager.getCurrentBindings();
      this.announcer.announce('Keyboard shortcuts help opened');
    } else {
      this.announcer.announce('Keyboard shortcuts help closed');
    }
  }

  getShortcutsByContext() {
    const groups: { [key: string]: any[] } = {};
    this.shortcuts.forEach(shortcut => {
      if (!groups[shortcut.context]) {
        groups[shortcut.context] = [];
      }
      groups[shortcut.context].push(shortcut);
    });
    return groups;
  }
}