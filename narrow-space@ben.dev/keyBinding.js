
export const BINDINGS = [
  // move to workspace bindings
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `narrow-space-switch-workspace${i + 1}`,
    handler(ext) {
      ext.switchToWorkspace(i + 1);
    },
  })),
  {
    name: 'narrow-space-switch-workspace-s',
    handler(ext) {
      ext.switchToWorkspace('S');
    },
  },
  {
    name: 'narrow-space-switch-workspace-b',
    handler(ext) {
      ext.switchToWorkspace('B');
    },
  },
  {
    name: 'narrow-space-switch-workspace-m',
    handler(ext) {
      ext.switchToWorkspace('M');
    },
  },
  {
    name: 'narrow-space-switch-workspace-t',
    handler(ext) {
      ext.switchToWorkspace('T');
    },
  },

  // move window to workspace bindings
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `narrow-space-move-window-to-workspace-${i + 1}`,
    handler(ext) {
      ext.moveWindowToWorkspace(i + 1);
    },
  })),
  {
    name: 'narrow-space-move-window-to-workspace-s',
    handler(ext) {
      ext.moveWindowToWorkspace('S');
    },
  },
  {
    name: 'narrow-space-move-window-to-workspace-b',
    handler(ext) {
      ext.moveWindowToWorkspace('B');
    },
  },
  {
    name: 'narrow-space-move-window-to-workspace-m',
    handler(ext) {
      ext.moveWindowToWorkspace('M');
    },
  },
  {
    name: 'narrow-space-move-window-to-workspace-t',
    handler(ext) {
      ext.moveWindowToWorkspace('T');
    },
  },

  // move focus in workspace
  {
    name: 'narrow-space-move-focus-left',
    handler(ext) {
      ext.moveFocus('left');
    },
  },
  {
    name: 'narrow-space-move-focus-right',
    handler(ext) {
      ext.moveFocus('right');
    },
  },
  {
    name: 'narrow-space-move-focus-up',
    handler(ext) {
      ext.moveFocus('up');
    },
  },
  {
    name: 'narrow-space-move-focus-down',
    handler(ext) {
      ext.moveFocus('down');
    },
  },
  {
    name: 'narrow-space-change-workspace-mode',
    handler(ext) {
      ext.changeWorkspaceMode();
    },
  },
  {
    name: 'narrow-space-resize-inc',
    handler(ext) {
      ext.resizeWindow('+');
    },
  },
  {
    name: 'narrow-space-resize-dec',
    handler(ext) {
      ext.resizeWindow('-');
    },
  },
  {
    name: 'narrow-space-move-window-left',
    handler(ext) {
      ext.moveWindow('left');
    },
  },
  {
    name: 'narrow-space-move-window-right',
    handler(ext) {
      ext.moveWindow('right');
    },
  },
  {
    name: 'narrow-space-move-window-up',
    handler(ext) {
      ext.moveWindow('up');
    },
  },
  {
    name: 'narrow-space-move-window-down',
    handler(ext) {
      ext.moveWindow('down');
    },
  },
  {
    name: 'narrow-space-service-mode',
    handler(ext) {
      ext.serviceMode();
    },
  },
  {
    name: 'narrow-space-toggle-floating',
    handler(ext) {
      ext.toggleFloating();
    },
  }
];

