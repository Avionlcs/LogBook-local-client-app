import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerInventoryQuantityShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['+'],
      handler: () => increaseQuantity(),
      context: 'inventory',
      description: 'Increase quantity'
    }),
    manager.register({
      keys: ['-'],
      handler: () => decreaseQuantity(),
      context: 'inventory',
      description: 'Decrease quantity'
    }),
    manager.register({
      keys: ['Shift', '+'],
      handler: () => increaseQuantity(10),
      context: 'inventory',
      description: 'Increase quantity by 10'
    }),
    manager.register({
      keys: ['Shift', '-'],
      handler: () => decreaseQuantity(10),
      context: 'inventory',
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