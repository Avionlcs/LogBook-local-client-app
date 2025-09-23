import { Injectable } from '@angular/core';
import { TelemetryAdapter } from './shortcuts-types';

@Injectable({ providedIn: 'root' })
export class DefaultTelemetryService implements TelemetryAdapter {
  logShortcut(keys: string[], context: string, handlerName: string): void {
    // No-op by default - integrate with your analytics service
    console.debug(`Shortcut: ${keys.join('+')}, Context: ${context}, Handler: ${handlerName}`);
  }
}