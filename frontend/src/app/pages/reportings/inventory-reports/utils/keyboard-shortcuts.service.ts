// src/app/features/inventory-reports/utils/keyboard-shortcuts.service.ts
import { Injectable } from '@angular/core';
import { InventoryReportsComponent } from '../inventory-reports.component';

@Injectable()
export class KeyboardShortcutsService {
  private handleKeydown: ((event: KeyboardEvent) => void) | null = null;

  setupKeyboardShortcuts(component: InventoryReportsComponent) {
    this.handleKeydown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'N') {
        event.preventDefault();
        component.toggleModal();
        component.focusAddItemNameInput();
        return;
      }

      if (event.shiftKey && event.key === 'S') {
        event.preventDefault();
        component.focusSearchInput();
        return;
      }

      if (event.shiftKey && event.key === 'Backspace') {
        event.preventDefault();
        component.searchValue = '';
        component.handleSearchChange();
        return;
      }

      if (event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        if (component.modalVisible.value && component.processingState === 'add_item_init') {
          const link = document.createElement('a');
          link.href = component.templateUrl;
          link.download = 'inventory_template.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (document.activeElement?.classList.contains('add-item-name') && component.validationService.isItemValid(component.item)) {
          component.addItem();
        } else {
          component.handleSearchChange();
        }
        return;
      }

      if (
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        /^[a-zA-Z0-9\s]$/.test(event.key)
      ) {
        component.searchValue += event.key;
        component.handleSearchChange();
      }

      if (event.key === 'Backspace' && !event.shiftKey) {
        component.searchValue = component.searchValue.slice(0, -1);
        component.handleSearchChange();
      }
    };

    document.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy() {
    if (this.handleKeydown) {
      document.removeEventListener('keydown', this.handleKeydown);
    }
  }
}