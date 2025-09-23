import { Injectable, Inject, Optional, NgZone } from '@angular/core';
import { ShortcutConfig, ShortcutRegistry, TelemetryAdapter, StorageAdapter, ShortcutOverride } from './shortcuts-types';
import { normalizeKeys, matchesShortcut, isTextInput, resolveConflict } from './shortcut-helpers';

@Injectable({ providedIn: 'root' })
export class CoreShortcutsManagerService {
  private registry: ShortcutRegistry = {};
  private activeContext: string | null = null;
  private overrides: ShortcutOverride[] = [];
  private isEnabled = true;

  constructor(
    @Optional() @Inject('TELEMETRY_ADAPTER') private telemetry: TelemetryAdapter,
    @Optional() @Inject('STORAGE_ADAPTER') private storage: StorageAdapter,
    private ngZone: NgZone
  ) {
    this.loadOverrides();
    this.setupGlobalListener();
  }

  setContext(context: string | null): void {
    this.activeContext = context;
  }

  register(config: ShortcutConfig): () => void {
    const context = config.context || 'global';
    const keyString = normalizeKeys(config.keys).join('+');
    
    if (!this.registry[context]) {
      this.registry[context] = new Map();
    }

    const existing = this.registry[context].get(keyString);
    if (existing) {
      const { winner, reason } = resolveConflict(existing, config, context);
      console.warn(`Shortcut conflict for ${keyString} in ${context}: ${reason}`);
      
      if (winner === existing) {
        // Keep existing, return no-op unregister
        return () => {};
      }
    }

    this.registry[context].set(keyString, config);
    
    return () => this.unregister(context, keyString);
  }

  unregister(context: string, keyString?: string): void {
    if (keyString) {
      this.registry[context]?.delete(keyString);
    } else {
      delete this.registry[context];
    }
  }

  private setupGlobalListener(): void {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.handleKeydown.bind(this), { 
        passive: false 
      });
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;
    
    const activeElement = document.activeElement;
    if (activeElement && isTextInput(activeElement)) {
      return;
    }

    const contexts = [this.activeContext, 'global'].filter(Boolean) as string[];
    
    for (const context of contexts) {
      const handler = this.findMatchingHandler(event, context);
      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        
        this.executeHandler(handler, event, context);
        break;
      }
    }
  }

  private findMatchingHandler(event: KeyboardEvent, context: string): ShortcutConfig | null {
    const contextShortcuts = this.registry[context];
    if (!contextShortcuts) return null;

    for (const [keys, config] of contextShortcuts.entries()) {
      if (matchesShortcut(event, config.keys)) {
        const override = this.overrides.find(o => 
          o.context === context && 
          o.keys.join('+') === keys
        );
        
        if (!override || override.enabled) {
          return config;
        }
      }
    }
    
    return null;
  }

  private executeHandler(config: ShortcutConfig, event: KeyboardEvent, context: string): void {
    this.telemetry?.logShortcut(config.keys, context, config.handler.name || 'anonymous');
    
    this.ngZone.run(() => {
      config.handler(event);
    });
  }

  private loadOverrides(): void {
    try {
      const stored = this.storage?.getItem('keyboard-shortcuts-overrides');
      if (stored) {
        this.overrides = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load shortcut overrides:', error);
    }
  }

  saveOverrides(overrides: ShortcutOverride[]): void {
    this.overrides = overrides;
    this.storage?.setItem('keyboard-shortcuts-overrides', JSON.stringify(overrides));
  }

  getCurrentBindings(): Array<{ keys: string[]; description?: string; context: string }> {
    const bindings = [];
    const contexts = this.activeContext ? [this.activeContext, 'global'] : Object.keys(this.registry);
    
    for (const context of contexts) {
      const shortcuts = this.registry[context];
      if (shortcuts) {
        for (const [keys, config] of shortcuts.entries()) {
          if (!this.isOverrideDisabled(context, keys)) {
            bindings.push({
              keys: keys.split('+'),
              description: config.description,
              context
            });
          }
        }
      }
    }
    
    return bindings;
  }

  private isOverrideDisabled(context: string, keys: string): boolean {
    const override = this.overrides.find(o => 
      o.context === context && 
      o.keys.join('+') === keys
    );
    return override ? !override.enabled : false;
  }

  enable(): void { this.isEnabled = true; }
  disable(): void { this.isEnabled = false; }
}