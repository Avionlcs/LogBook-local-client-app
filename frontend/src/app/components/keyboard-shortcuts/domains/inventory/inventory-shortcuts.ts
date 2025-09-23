export { registerInventoryNavigationShortcuts } from './inventory-navigation';
export { registerInventoryQuantityShortcuts } from './inventory-quantity';
export { registerInventoryActionsShortcuts } from './inventory-actions';

export function registerAllInventoryShortcuts(manager: any) {
  const unregisterFns = [
    registerInventoryNavigationShortcuts(manager),
    registerInventoryQuantityShortcuts(manager),
    registerInventoryActionsShortcuts(manager)
  ];

  return () => unregisterFns.forEach(fn => fn());
}