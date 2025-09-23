import { ShortcutConfig } from './shortcuts-types';

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
}