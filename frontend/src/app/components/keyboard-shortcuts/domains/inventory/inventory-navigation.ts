import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerInventoryNavigationShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['ArrowRight'],
      handler: () => navigateNextItem(),
      context: 'inventory',
      description: 'Navigate to next item'
    }),
    manager.register({
      keys: ['ArrowLeft'],
      handler: () => navigatePrevItem(),
      context: 'inventory',
      description: 'Navigate to previous item'
    }),
    manager.register({
      keys: ['Home'],
      handler: () => navigateFirstItem(),
      context: 'inventory',
      description: 'Navigate to first item'
    }),
    manager.register({
      keys: ['End'],
      handler: () => navigateLastItem(),
      context: 'inventory',
      description: 'Navigate to last item'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function navigateNextItem() {
  // Implement navigation logic
  console.log('Next item');
}

function navigatePrevItem() {
  // Implement navigation logic
  console.log('Previous item');
}

function navigateFirstItem() {
  console.log('First item');
}

function navigateLastItem() {
  console.log('Last item');
}