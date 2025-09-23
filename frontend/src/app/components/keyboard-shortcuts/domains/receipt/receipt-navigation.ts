import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerReceiptNavigationShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['ArrowRight'],
      handler: () => navigateNextItem(),
      context: 'receipt',
      description: 'Navigate to next item'
    }),
    manager.register({
      keys: ['ArrowLeft'],
      handler: () => navigatePrevItem(),
      context: 'receipt',
      description: 'Navigate to previous item'
    }),
    manager.register({
      keys: ['Home'],
      handler: () => navigateFirstItem(),
      context: 'receipt',
      description: 'Navigate to first item'
    }),
    manager.register({
      keys: ['End'],
      handler: () => navigateLastItem(),
      context: 'receipt',
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