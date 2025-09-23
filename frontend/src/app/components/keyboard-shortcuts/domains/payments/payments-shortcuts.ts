export { registerPaymentsNavigationShortcuts } from './payments-navigation';
export { registerPaymentsQuantityShortcuts } from './payments-quantity';
export { registerPaymentsActionsShortcuts } from './payments-actions';

export function registerAllPaymentsShortcuts(manager: any) {
  const unregisterFns = [
    registerPaymentsNavigationShortcuts(manager),
    registerPaymentsQuantityShortcuts(manager),
    registerPaymentsActionsShortcuts(manager)
  ];

  return () => unregisterFns.forEach(fn => fn());
}