import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerReceiptQuantityShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['+'],
      handler: () => increaseQuantity(),
      context: 'receipt',
      description: 'Increase quantity'
    }),
    manager.register({
      keys: ['-'],
      handler: () => decreaseQuantity(),
      context: 'receipt',
      description: 'Decrease quantity'
    }),
    manager.register({
      keys: ['Shift', '+'],
      handler: () => increaseQuantity(10),
      context: 'receipt',
      description: 'Increase quantity by 10'
    }),
    manager.register({
      keys: ['Shift', '-'],
      handler: () => decreaseQuantity(10),
      context: 'receipt',
      description: 'Decrease quantity by 10'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function increaseQuantity(amount = 1) {
  console.log(`Increase by ${amount}`);
}

function decreaseQuantity(amount = 1) {
  console.log(`Decrease by ${amount}`);
}