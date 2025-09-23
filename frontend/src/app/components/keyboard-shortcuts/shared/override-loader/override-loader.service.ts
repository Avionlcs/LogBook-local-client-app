import { Injectable } from '@angular/core';
import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';
import { ShortcutOverride } from '../../core/shortcuts/shortcuts-types';

@Injectable({ providedIn: 'root' })
export class OverrideLoaderService {
  constructor(private shortcutsManager: CoreShortcutsManagerService) {}

  loadOverridesFromJson(json: string): boolean {
    try {
      const overrides: ShortcutOverride[] = JSON.parse(json);
      
      // Validate structure
      if (!Array.isArray(overrides)) throw new Error('Overrides must be an array');
      
      for (const override of overrides) {
        if (!override.keys || !Array.isArray(override.keys)) {
          throw new Error('Each override must have a keys array');
        }
        if (typeof override.enabled !== 'boolean') {
          throw new Error('Each override must have an enabled boolean');
        }
      }

      this.shortcutsManager.saveOverrides(overrides);
      return true;
    } catch (error) {
      console.error('Failed to load overrides:', error);
      return false;
    }
  }

  mergeOverrides(newOverrides: ShortcutOverride[]): ShortcutOverride[] {
    const current = this.shortcutsManager.getCurrentBindings().map(binding => ({
      keys: binding.keys,
      context: binding.context,
      action: binding.description || '',
      enabled: true
    }));

    const merged = [...current];
    
    for (const newOverride of newOverrides) {
      const existingIndex = merged.findIndex(o => 
        o.keys.join('+') === newOverride.keys.join('+') && 
        o.context === newOverride.context
      );
      
      if (existingIndex !== -1) {
        merged[existingIndex] = { ...merged[existingIndex], ...newOverride };
      } else {
        merged.push(newOverride);
      }
    }
    
    return merged;
  }
}