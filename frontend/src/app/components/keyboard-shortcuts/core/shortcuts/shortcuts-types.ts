export interface ShortcutConfig {
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
}