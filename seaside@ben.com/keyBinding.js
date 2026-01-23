
export const BINDINGS = [
  // move to workspace bindings
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `seaspace-switch-workspace${i + 1}`,
    handler(ext) {
      ext.switchToWorkspace(i + 1);
    },
  })),
  {
    name: 'seaspace-switch-workspace-s',
    handler(ext) {
      ext.switchToWorkspace('S');
    },
  },
  {
    name: 'seaspace-switch-workspace-b',
    handler(ext) {
      ext.switchToWorkspace('B');
    },
  },
  {
    name: 'seaspace-switch-workspace-m',
    handler(ext) {
      ext.switchToWorkspace('M');
    },
  },
  {
    name: 'seaspace-switch-workspace-t',
    handler(ext) {
      ext.switchToWorkspace('T');
    },
  },

  // move window to workspace bindings
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `seaspace-move-window-to-workspace-${i + 1}`,
    handler(ext) {
      ext.moveWindowToWorkspace(i + 1);
    },
  })),
  {
    name: 'seaspace-move-window-to-workspace-s',
    handler(ext) {
      ext.moveWindowToWorkspace('S');
    },
  },
  {
    name: 'seaspace-move-window-to-workspace-b',
    handler(ext) {
      ext.moveWindowToWorkspace('B');
    },
  },
  {
    name: 'seaspace-move-window-to-workspace-m',
    handler(ext) {
      ext.moveWindowToWorkspace('M');
    },
  },
  {
    name: 'seaspace-move-window-to-workspace-t',
    handler(ext) {
      ext.moveWindowToWorkspace('T');
    },
  },

  // move focus in workspace
  {
    name: 'seaspace-move-focus-left',
    handler(ext) {
      ext.moveFocus('left');
    },
  },
  {
    name: 'seaspace-move-focus-right',
    handler(ext) {
      ext.moveFocus('right');
    },
  },
  {
    name: 'seaspace-move-focus-up',
    handler(ext) {
      ext.moveFocus('up');
    },
  },
  {
    name: 'seaspace-move-focus-down',
    handler(ext) {
      ext.moveFocus('down');
    },
  },
];

