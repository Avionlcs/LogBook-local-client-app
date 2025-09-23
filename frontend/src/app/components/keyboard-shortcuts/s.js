#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { existsSync } = require('fs');

class ShortcutsScaffolder {
  constructor(basePath, dryRun = false, force = false) {
    this.basePath = path.resolve(process.cwd(), basePath);
    this.dryRun = dryRun;
    this.force = force;
    this.filesCreated = 0;
    this.filesSkipped = 0;
  }

  async scaffold() {
    try {
      console.log(`Scaffolding shortcuts system in: ${this.basePath}`);
      if (this.dryRun) console.log('DRY RUN - No files will be written');

      await this.createCoreFiles();
      await this.createDomainFiles();
      await this.createSharedFiles();

      console.log(`\nScaffolding complete!`);
      console.log(`Files created: ${this.filesCreated}`);
      console.log(`Files skipped: ${this.filesSkipped}`);
      if (this.dryRun) console.log('This was a dry run - no files written');
    } catch (error) {
      console.error('Scaffolding failed:', error.message);
      process.exit(1);
    }
  }

  async createFile(filePath, content) {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    if (!this.dryRun) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (existsSync(fullPath) && !this.force) {
      console.log(`SKIP: ${filePath} (exists)`);
      this.filesSkipped++;
      return;
    }

    if (this.dryRun) {
      console.log(`DRY WRITE: ${filePath}`);
      this.filesCreated++;
      return;
    }

    await fs.writeFile(fullPath, content);
    console.log(`WRITE: ${filePath}`);
    this.filesCreated++;
  }

  async createCoreFiles() {
    const corePath = 'core/shortcuts';

    // Types
    await this.createFile(
      `${corePath}/shortcuts-types.ts`,
      `export interface ShortcutConfig {
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  context?: string;
  allowInInputs?: boolean;
  description?: string;
}

export interface ShortcutRegistry {
  [context: string]: Map<string, ShortcutConfig>;
}

export interface TelemetryAdapter {
  logShortcut(keys: string[], context: string, handlerName: string): void;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ShortcutOverride {
  keys: string[];
  context: string;
  action: string;
  enabled: boolean;
}`
    );

    // Helpers
    await this.createFile(
      `${corePath}/shortcut-helpers.ts`,
      `import { ShortcutConfig } from './shortcuts-types';

export function normalizeKeys(keys: string[]): string[] {
  return keys.map(key => key.toLowerCase().trim());
}

export function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  const normalized = normalizeKeys(keys);
  const pressed = [
    event.ctrlKey && 'control',
    event.metaKey && 'meta',
    event.altKey && 'alt',
    event.shiftKey && 'shift',
    event.key.toLowerCase()
  ].filter(Boolean);

  if (pressed.length !== normalized.length) return false;
  
  return normalized.every(key => pressed.includes(key));
}

export function isTextInput(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type');
  
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(type || 'text');
  }
  if (element.hasAttribute('contenteditable')) return true;
  
  return false;
}

export function resolveConflict(
  existing: ShortcutConfig,
  incoming: ShortcutConfig,
  context: string
): { winner: ShortcutConfig; reason: string } {
  // Context specificity takes precedence
  if (existing.context && !incoming.context) {
    return { winner: existing, reason: 'Existing has specific context' };
  }
  if (!existing.context && incoming.context) {
    return { winner: incoming, reason: 'Incoming has specific context' };
  }
  
  // More descriptive handlers are preferred
  if (existing.description && !incoming.description) {
    return { winner: existing, reason: 'Existing has description' };
  }
  
  return { winner: incoming, reason: 'Registration order (incoming wins)' };
}`
    );

    // Manager Service
    await this.createFile(
      `${corePath}/core-shortcuts-manager.service.ts`,
      `import { Injectable, Inject, Optional, NgZone } from '@angular/core';
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
      console.warn(\`Shortcut conflict for \${keyString} in \${context}: \${reason}\`);
      
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
}`
    );

    // Aria Announcer
    await this.createFile(
      `${corePath}/aria-announcer.service.ts`,
      `import { Injectable, Inject, Optional } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AriaAnnouncerService {
  private liveElement: HTMLElement | null = null;

  constructor(@Optional() @Inject('DOCUMENT') private document: Document) {
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    if (this.document) {
      const el = this.document.createElement('div');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      el.style.cssText = \`
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      \`;
      this.document.body.appendChild(el);
      this.liveElement = el;
    }
  }

  announce(message: string): void {
    if (this.liveElement) {
      this.liveElement.textContent = '';
      setTimeout(() => {
        if (this.liveElement) {
          this.liveElement.textContent = message;
        }
      }, 100);
    }
  }

  announceShortcut(keys: string[], action: string): void {
    this.announce(\`\${action}: \${keys.join(' + ')}\`);
  }
}`
    );

    // Default Telemetry
    await this.createFile(
      `${corePath}/default-telemetry.service.ts`,
      `import { Injectable } from '@angular/core';
import { TelemetryAdapter } from './shortcuts-types';

@Injectable({ providedIn: 'root' })
export class DefaultTelemetryService implements TelemetryAdapter {
  logShortcut(keys: string[], context: string, handlerName: string): void {
    // No-op by default - integrate with your analytics service
    console.debug(\`Shortcut: \${keys.join('+')}, Context: \${context}, Handler: \${handlerName}\`);
  }
}`
    );
  }

  async createDomainFiles() {
    const domains = ['inventory', 'receipt', 'payments'];
    
    for (const domain of domains) {
      const domainPath = `domains/${domain}`;

      // Navigation shortcuts
      await this.createFile(
        `${domainPath}/${domain}-navigation.ts`,
        `import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function register${this.capitalize(domain)}NavigationShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['ArrowRight'],
      handler: () => navigateNextItem(),
      context: '${domain}',
      description: 'Navigate to next item'
    }),
    manager.register({
      keys: ['ArrowLeft'],
      handler: () => navigatePrevItem(),
      context: '${domain}',
      description: 'Navigate to previous item'
    }),
    manager.register({
      keys: ['Home'],
      handler: () => navigateFirstItem(),
      context: '${domain}',
      description: 'Navigate to first item'
    }),
    manager.register({
      keys: ['End'],
      handler: () => navigateLastItem(),
      context: '${domain}',
      description: 'Navigate to last item'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function navigateNextItem() {
  // Implement navigation logic
  console.log('Next item');
}

function navigatePrevItem() {
  // Implement navigation logic
  console.log('Previous item');
}

function navigateFirstItem() {
  console.log('First item');
}

function navigateLastItem() {
  console.log('Last item');
}`
      );

      // Quantity shortcuts
      await this.createFile(
        `${domainPath}/${domain}-quantity.ts`,
        `import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function register${this.capitalize(domain)}QuantityShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['+'],
      handler: () => increaseQuantity(),
      context: '${domain}',
      description: 'Increase quantity'
    }),
    manager.register({
      keys: ['-'],
      handler: () => decreaseQuantity(),
      context: '${domain}',
      description: 'Decrease quantity'
    }),
    manager.register({
      keys: ['Shift', '+'],
      handler: () => increaseQuantity(10),
      context: '${domain}',
      description: 'Increase quantity by 10'
    }),
    manager.register({
      keys: ['Shift', '-'],
      handler: () => decreaseQuantity(10),
      context: '${domain}',
      description: 'Decrease quantity by 10'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function increaseQuantity(amount = 1) {
  console.log(\`Increase by \${amount}\`);
}

function decreaseQuantity(amount = 1) {
  console.log(\`Decrease by \${amount}\`);
}`
      );

      // Actions shortcuts
      await this.createFile(
        `${domainPath}/${domain}-actions.ts`,
        `import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function register${this.capitalize(domain)}ActionsShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['Control', 's'],
      handler: (event) => {
        event.preventDefault();
        saveItem();
      },
      context: '${domain}',
      description: 'Save current item'
    }),
    manager.register({
      keys: ['Delete'],
      handler: () => deleteItem(),
      context: '${domain}',
      description: 'Delete current item'
    }),
    manager.register({
      keys: ['F2'],
      handler: () => editItem(),
      context: '${domain}',
      description: 'Edit current item'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function saveItem() {
  console.log('Save item');
}

function deleteItem() {
  console.log('Delete item');
}

function editItem() {
  console.log('Edit item');
}`
      );

      // Domain aggregator
      await this.createFile(
        `${domainPath}/${domain}-shortcuts.ts`,
        `export { register${this.capitalize(domain)}NavigationShortcuts } from './${domain}-navigation';
export { register${this.capitalize(domain)}QuantityShortcuts } from './${domain}-quantity';
export { register${this.capitalize(domain)}ActionsShortcuts } from './${domain}-actions';

export function registerAll${this.capitalize(domain)}Shortcuts(manager: any) {
  const unregisterFns = [
    register${this.capitalize(domain)}NavigationShortcuts(manager),
    register${this.capitalize(domain)}QuantityShortcuts(manager),
    register${this.capitalize(domain)}ActionsShortcuts(manager)
  ];

  return () => unregisterFns.forEach(fn => fn());
}`
      );
    }
  }

  async createSharedFiles() {
    // Help Overlay Component
    await this.createFile(
      'shared/help-overlay/help-overlay.component.ts',
      `import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
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
}`
    );

    await this.createFile(
      'shared/help-overlay/help-overlay.component.html',
      `<div class="help-overlay" *ngIf="isVisible" (click)="toggleOverlay()">
  <div class="help-content" (click)="$event.stopPropagation()">
    <header class="help-header">
      <h2>Keyboard Shortcuts</h2>
      <button (click)="toggleOverlay()" class="close-button" aria-label="Close help">×</button>
    </header>
    
    <div class="shortcuts-list">
      <div *ngFor="let context of getShortcutsByContext() | keyvalue" class="context-group">
        <h3>{{ context.key }}</h3>
        <div *ngFor="let shortcut of context.value" class="shortcut-item">
          <span class="keys">
            <kbd *ngFor="let key of shortcut.keys">{{ key }}</kbd>
          </span>
          <span class="description">{{ shortcut.description }}</span>
        </div>
      </div>
    </div>
  </div>
</div>`
    );

    await this.createFile(
      'shared/help-overlay/help-overlay.component.css',
      `.help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.help-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.help-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.context-group {
  margin-bottom: 2rem;
}

.context-group h3 {
  text-transform: capitalize;
  margin-bottom: 1rem;
  color: #333;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.keys kbd {
  background: #f4f4f4;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.3rem;
  font-family: monospace;
}`
    );

    // Override Loader Service
    await this.createFile(
      'shared/override-loader/override-loader.service.ts',
      `import { Injectable } from '@angular/core';
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
}`
    );
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI parsing and execution
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    base: '.',
    dry: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base':
        options.base = args[++i];
        break;
      case '--dry':
        options.dry = true;
        break;
      case '--force':
        options.force = true;
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const scaffolder = new ShortcutsScaffolder(options.base, options.dry, options.force);
  await scaffolder.scaffold();
}

if (require.main === module) {
  main();
}

module.exports = { ShortcutsScaffolder };