import { CoreShortcutsManagerService } from '../../core/shortcuts/core-shortcuts-manager.service';

export function registerInventoryActionsShortcuts(
  manager: CoreShortcutsManagerService
) {
  const unregister = [
    manager.register({
      keys: ['Control', 's'],
      handler: (event) => {
        event.preventDefault();
        saveItem();
      },
      context: 'inventory',
      description: 'Save current item'
    }),
    manager.register({
      keys: ['Delete'],
      handler: () => deleteItem(),
      context: 'inventory',
      description: 'Delete current item'
    }),
    manager.register({
      keys: ['F2'],
      handler: () => editItem(),
      context: 'inventory',
      description: 'Edit current item'
    })
  ];

  return () => unregister.forEach(fn => fn());
}

function saveItem() {
  console.log('Save item');
}

function deleteItem() {
  console.log('Delete item');
}

function editItem() {
  console.log('Edit item');
}