export const MAX_NMB_OF_WORKSPACES = 16;
export const BINDINGS = [
  // move to workspace bindings
  ...Array.from({ length: MAX_NMB_OF_WORKSPACES }, (_, i) => ({
    name: `narrow-space-switch-workspace-${i + 1}`,
    handler(ext) {
      ext.switchToWorkspace(i + 1);
    },
  })),

  // move window to workspace bindings
  ...Array.from({ length: MAX_NMB_OF_WORKSPACES }, (_, i) => ({
    name: `narrow-space-move-window-to-workspace-${i + 1}`,
    handler(ext) {
      ext.moveWindowToWorkspace(i + 1);
    },
  })),

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

