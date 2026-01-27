import St from 'gi://St';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WorkspaceNode } from './WorkspaceNode.js';
import { WindowNode } from './WindowNode.js';
import { BINDINGS } from './keyBinding.js';

export default class SeaSpaceExtension extends Extension {
    enable() {
        // panel indicator
        this.indicator = new PanelMenu.Button(0.0, 'SeaSpace');
        this.label = new St.Label({
            text: '1',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.indicator.add_child(this.label);
        Main.panel.addToStatusArea('seaspace-indicator', this.indicator);

        // keybindings 
        this.settings = this.getSettings('org.gnome.shell.extensions.seaspace');
        this.registerKeybindings();

        this.activeWorkspace = 1;
        this.workspaces = new Map();
        this.workspaces.set('S', new WorkspaceNode('S'));
        this.workspaces.set('T', new WorkspaceNode('T'));
        this.workspaces.set('B', new WorkspaceNode('B'));
        this.workspaces.set('M', new WorkspaceNode('M'));
        for (let i = 1; i < 10; i++) {
            this.workspaces.set(i, new WorkspaceNode(i));
        }

        this.updateWorkAreas = () => {
            const area = Main.layoutManager.getWorkAreaForMonitor(0);

            for (const [id, ws] of this.workspaces) {
                ws.setWorkArea({ x: area.x, y: area.y, width: area.width, height: area.height });

                if (id === this.activeWorkspace) {
                    ws.show();
                }
                else {
                    ws.hide();
                }
            }
        };

        // initial update after current layout pass
        this._workAreaIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.updateWorkAreas();
            return GLib.SOURCE_REMOVE;
        });

        // keep area in sync if monitors/workareas change
        // this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this.updateWorkAreas());
        // this._workareasChangedId = Main.layoutManager.connect('workareas-changed', () => this.updateWorkAreas());

        this.windowCreatedId = global.display.connect('window-created', (_display, metaWindow) => {
            log('[SeaSpace] connect lambda');
            this.onWindowCreated(metaWindow);
        });

        this.windowClosedId = global.display.connect('window-closed', (_display, metaWindow) => {
            log('[SeaSpace] closed lambda');
            this.removeWindowEverywhere(metaWindow.get_id());
        });

        this.focusChangedId = global.display.connect('notify::focus-window', () => {
            const win = global.display.get_focus_window();
            if (!win)
                return;

            this.onWindowFocused(win.get_id());
        });

        this.seedExistingWindows();
    }

    disable() {
        this.unregisterKeybindings();
        this.settings = null;

        if (this._workAreaIdleId) {
            GLib.source_remove(this._workAreaIdleId);
            this._workAreaIdleId = 0;
        }

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }
        if (this._workareasChangedId) {
            Main.layoutManager.disconnect(this._workareasChangedId);
            this._workareasChangedId = 0;
        }

        if (this.windowCreatedId) {
            global.display.disconnect(this.windowCreatedId);
            this.windowCreatedId = 0;
        }
        if (this.windowClosedId) {
            global.display.disconnect(this.windowClosedId);
            this.windowClosedId = 0;
        }
        if (this.focusChangedId) {
            global.display.disconnect(this.focusChangedId);
            this.focusChangedId = 0;
        }

        if (this.indicator) {
            this.indicator.destroy();
            this.indicator = null;
        }

        this.workspaces?.clear();
        this.workspaces = null;
    }

    registerKeybindings() {
        for (const b of BINDINGS) {
            Main.wm.addKeybinding(
                b.name,
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => b.handler(this)
            );
        }
    }

    unregisterKeybindings() {
        for (const b of BINDINGS)
            Main.wm.removeKeybinding(b.name);
    }

    changeWorkspaceMode() {
        this.workspaces.get(this.activeWorkspace)?.setNextMode();
    }

    moveFocus(direction) {
        this.workspaces.get(this.activeWorkspace)?.moveFocus(direction);
    }

    resizeWindow(direction) {
        let deltaSize = 0;
        if (direction === '+') {
            deltaSize = 30;
        } else if (direction === '-') {
            deltaSize = -30;
        }
        this.workspaces.get(this.activeWorkspace)?.resize(deltaSize);
    }

    switchToWorkspace(workspaceId) {
        this.activeWorkspace = workspaceId;
        this.label.set_text(String(this.activeWorkspace));
        this.updateWorkAreas();
    }

    moveWindow(direction) {
        this.workspaces.get(this.activeWorkspace).moveWindow(direction);
    }

    moveWindowToWorkspace(workspaceId) {
        if (workspaceId === this.activeWorkspace) {
            log(`[SeaSpace] window already in this workspace`);
            return;
        }

        const activeWin = this.getActiveWindow();
        if (!activeWin) {
            log('[SeaSpace] no focused window');
            return;
        }

        const activeWinId = activeWin.get_id();

        const fromWs = this.workspaces.get(this.activeWorkspace);
        const toWs = this.workspaces.get(workspaceId);

        if (!fromWs || !toWs) {
            log(`[SeaSpace] workspace model missing (from=${this.activeWorkspace}, to=${workspaceId})`);
            return;
        }

        const wasPresent = fromWs.removeLeaf(activeWinId, /*show*/ false);
        if (!wasPresent) {
            log(`[SeaSpace] window ${activeWinId} not found in workspace ${this.activeWorkspace}`);
            return;
        }

        const leaf = new WindowNode(activeWinId);
        leaf.setMetaWindow?.(activeWin);
        toWs.addLeaf(leaf);

        if (workspaceId === this.activeWorkspace) toWs.show();
        
        fromWs.show();
        this.updateWorkAreas();
    }

    getActiveWindow() {
        return global.display.get_focus_window?.() ?? global.display.focus_window ?? null;
    }

    onWindowFocused(metaWindowId) {
        for (const ws of this.workspaces.values()) {
            if (ws.setFocusedLeaf(metaWindowId)) {
                return;
            }
        }
    }

    seedExistingWindows() {
        // When enabling extension with existing windows, treat them like "created"
        for (const actor of global.get_window_actors()) {
            const w = actor?.meta_window;
            if (w)
                this.onWindowCreated(w);
        }
    }

    removeWindowEverywhere(metaWindowId) {
        if (!this.workspaces)
            return;

        for (const [id, ws] of this.workspaces) {
            const show = (id === this.activeWorkspace);
            ws.removeLeaf(metaWindowId, show);
        }
    }

    onWindowCreated(metaWindow) {
        this.waitForActor(metaWindow, (actor) => this.attachFirstFrameHandler(metaWindow, actor));
    }

    waitForActor(metaWindow, cb) {
        const id = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const actor = metaWindow.get_compositor_private?.();
            if (!actor)
                return GLib.SOURCE_CONTINUE;

            cb(actor);
            return GLib.SOURCE_REMOVE;
        });

        return id;
    }

    attachFirstFrameHandler(metaWindow, actor) {
        // We only want to run once per window.
        let firstFrameId = 0;
        let idleId = 0;
        let unmanagedId = 0;

        const cleanup = () => {
            if (idleId) {
                GLib.source_remove(idleId);
                idleId = 0;
            }
            if (firstFrameId) {
                actor.disconnect(firstFrameId);
                firstFrameId = 0;
            }
            if (unmanagedId) {
                metaWindow.disconnect(unmanagedId);
                unmanagedId = 0;
            }
        };

        unmanagedId = metaWindow.connect('unmanaged', () => {
            this.removeWindowEverywhere(metaWindow.get_id());
            cleanup();
        });

        firstFrameId = actor.connect('first-frame', () => {
            // disconnect immediately to prevent double-add
            actor.disconnect(firstFrameId);
            firstFrameId = 0;

            let tries = 0;
            idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                const r = metaWindow.get_frame_rect();

                // Some windows start with 0 size. Avoid infinite loop.
                if ((r.width === 0 || r.height === 0) && tries++ < 50) {
                    return GLib.SOURCE_CONTINUE;
                }

                const ws = this.workspaces.get(this.activeWorkspace);
                if (!ws) {
                    return GLib.SOURCE_REMOVE;
                }

                const id = metaWindow.get_id();

                // Avoid duplicates: if already exists, just refresh layout
                const already = ws.leafs.some(l => (l.getId()) === id);
                if (!already) {
                    const leaf = new WindowNode(id);
                    leaf.setMetaWindow?.(metaWindow);
                    ws.addLeaf(leaf);
                }

                this.updateWorkAreas();
                return GLib.SOURCE_REMOVE;
            });
        });
    }
}
