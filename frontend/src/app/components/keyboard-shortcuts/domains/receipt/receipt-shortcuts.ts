export { registerReceiptNavigationShortcuts } from './receipt-navigation';
export { registerReceiptQuantityShortcuts } from './receipt-quantity';
export { registerReceiptActionsShortcuts } from './receipt-actions';

export function registerAllReceiptShortcuts(manager: any) {
  const unregisterFns = [
    registerReceiptNavigationShortcuts(manager),
    registerReceiptQuantityShortcuts(manager),
    registerReceiptActionsShortcuts(manager)
  ];

  return () => unregisterFns.forEach(fn => fn());
}