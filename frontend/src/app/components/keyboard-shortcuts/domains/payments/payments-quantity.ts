import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerPaymentsQuantityShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['+'],
      handler: () => increaseQuantity(),
      context: 'payments',
      description: 'Increase quantity'
    }),
    manager.register({
      keys: ['-'],
      handler: () => decreaseQuantity(),
      context: 'payments',
      description: 'Decrease quantity'
    }),
    manager.register({
      keys: ['Shift', '+'],
      handler: () => increaseQuantity(10),
      context: 'payments',
      description: 'Increase quantity by 10'
    }),
    manager.register({
      keys: ['Shift', '-'],
      handler: () => decreaseQuantity(10),
      context: 'payments',
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