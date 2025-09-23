import { registerInventoryActionsShortcuts } from './inventory-actions';
import { registerInventoryNavigationShortcuts } from './inventory-navigation';
import { registerInventoryQuantityShortcuts } from './inventory-quantity';


export function registerAllInventoryShortcuts(manager: any) {
  const unregisterFns = [
    registerInventoryNavigationShortcuts(manager),
    registerInventoryQuantityShortcuts(manager),
    registerInventoryActionsShortcuts(manager)
  ];

  return () => unregisterFns.forEach(fn => fn());
}