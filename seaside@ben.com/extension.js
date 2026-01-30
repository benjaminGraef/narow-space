import St from 'gi://St';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

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
        this.indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem('SeaSpace', { reactive: false }));
        this.indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.paused = false;

        this.pauseItem = new PopupMenu.PopupSwitchMenuItem('Paused', this.paused);
        this.pauseItem.connect('toggled', (item, state) => {
            this.paused = state;
        });

        this.indicator.menu.addMenuItem(this.pauseItem);
        Main.panel.addToStatusArea('seaspace-indicator', this.indicator);

        // keybindings 
        this.settings = this.getSettings('org.gnome.shell.extensions.seaspace');
        this.registerKeybindings();

        if (!this.enabled) {
            this.isServiceModeOn = false;
            this.activeWorkspace = 1;
            this.workspaces = new Map();
            this.workspaces.set('S', new WorkspaceNode('S'));
            this.workspaces.set('T', new WorkspaceNode('T'));
            this.workspaces.set('B', new WorkspaceNode('B'));
            this.workspaces.set('M', new WorkspaceNode('M'));
            for (let i = 1; i < 10; i++) {
                this.workspaces.set(i, new WorkspaceNode(i));
            }

            this.floatingWindows = new Array();

        }


        // initial update after current layout pass
        this.workAreaIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.workAreaIdleId = 0;
            this.updateWorkAreas();
            return GLib.SOURCE_REMOVE;
        });

        // keep area in sync if monitors/workareas change
        // this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this.updateWorkAreas());
        // this._workareasChangedId = Main.layoutManager.connect('workareas-changed', () => this.updateWorkAreas());

        this.windowCreatedId = global.display.connect('window-created', (_display, metaWindow) => {
            this.onWindowCreated(metaWindow);
        });

        this.focusChangedId = global.display.connect('notify::focus-window', () => {
            const win = global.display.focus_window; // property
            if (!win) {
                return;
            }

            this.onWindowFocused(win.get_id());
        });

        this.grabOpEndId = global.display.connect('grab-op-end', (_display, metaWindow, op) => {
            this.windowGrabEnd(metaWindow.get_id());
        });

        this.enabled = true;

        log(`[SeaSpace] setup done`);
    }

    updateWorkAreas() {
        if (this.paused) {
            return;
        }
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


    disable() {
        this.unregisterKeybindings();
        this.settings = null;
        this._enabled = false;

        if (this.workAreaIdleId) {
            GLib.source_remove(this.workAreaIdleId);
            this.workAreaIdleId = 0;
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
        if (this.grabOpEndId) {
            global.display.disconnect(this.grabOpEndId);
            this.grabOpEndId = 0;
        }

        if (this.indicator) {
            this.indicator.destroy();
            this.indicator = null;
        }

        // this.workspaces?.clear();
        // this.workspaces = null;
    }

    windowGrabEnd(windowId) {
        if (this.paused) {
            return;
        }
        if (!windowId) {
            return;
        }

        // window was grabbed, probably dragged somewhere; retile unless floating
        if (this.floatingWindows.includes(windowId)) {
            return;
        }

        log(`[SeaSpace] window grab released redrawing`);
        this.workspaces.get(this.activeWorkspace)?.show();
    }

    toggleFloating() {
        if (this.paused) {
            return;
        }
        const metaWindow = global.display.get_focus_window();

        if (!metaWindow) {
            return;
        }

        const idx = this.floatingWindows.indexOf(metaWindow.get_id());
        if (idx !== -1) {
            const leaf = new WindowNode(metaWindow.get_id());
            leaf.setMetaWindow?.(metaWindow);
            this.workspaces.get(this.activeWorkspace).addLeaf(leaf);
            this.workspaces.get(this.activeWorkspace).show();
            this.floatingWindows.splice(idx, 1);
        } else {
            if (this.workspaces.get(this.activeWorkspace).removeLeaf(metaWindow.get_id())) {

                log(`[SeaSpace] adding window ${metaWindow} to list`);
                this.floatingWindows.push(metaWindow.get_id());
                metaWindow.activate(global.get_current_time());
            }
        }
    }

    registerKeybindings() {
        for (const b of BINDINGS) {
            Main.wm.addKeybinding(
                b.name,
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                () => b.handler(this)
            );
        }
    }

    unregisterKeybindings() {
        for (const b of BINDINGS)
            Main.wm.removeKeybinding(b.name);
    }

    changeWorkspaceMode() {
        if (this.paused) {
            return;
        }
        this.workspaces.get(this.activeWorkspace)?.setNextMode();
    }

    moveFocus(direction) {
        if (this.paused) {
            return;
        }
        this.workspaces.get(this.activeWorkspace)?.moveFocus(direction);
    }

    resizeWindow(direction) {
        if (this.paused) {
            return;
        }
        let deltaSize = 0;
        if (direction === '+') {
            deltaSize = 30;
        } else if (direction === '-') {
            deltaSize = -30;
        }
        this.workspaces.get(this.activeWorkspace)?.resize(deltaSize);
    }

    switchToWorkspace(workspaceId) {
        if (this.paused) {
            return;
        }

        if (workspaceId === this.activeWorkspace) {
            if (this.isServiceModeOn) {
                this.label.set_text(`${workspaceId} Se`);
            }
            else {
                this.label.set_text(String(workspaceId));
            }
            return;
        }

        log(`[SeaSpace]1 switching to workspace ${workspaceId}`)
        this.activeWorkspace = workspaceId;
        if (this.isServiceModeOn) {
            this.label.set_text(String(this.activeWorkspace) + " Se");
        } else {
            this.label.set_text(String(this.activeWorkspace));
        }
        this.updateWorkAreas();
    }


    moveWindow(direction) {
        if (this.paused) {
            return;
        }
        if (!this.isServiceModeOn) {
            this.workspaces.get(this.activeWorkspace).moveWindow(direction);
        } else {
            this.workspaces.get(this.activeWorkspace).joinWindow(direction);
        }
    }

    serviceMode() {
        if (this.paused) {
            return;
        }
        this.isServiceModeOn = !this.isServiceModeOn;
        if (this.isServiceModeOn) {
            this.label.set_text(String(this.activeWorkspace) + " Se");
        } else {
            this.label.set_text(String(this.activeWorkspace));
        }
    }

    moveWindowToWorkspace(workspaceId) {
        if (this.paused) {
            return;
        }
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
        if (this.paused) {
            return;
        }
        for (const [id, ws] of this.workspaces) {
            if (ws.setFocusedLeaf(metaWindowId)) {
                this.switchToWorkspace(id);
                return;
            }
        }
        return;
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
        if (this.paused) {
            return;
        }
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

    isTrackableWindow(metaWindow) {
        if (!metaWindow)
            return false;

        const t = metaWindow.get_window_type();

        if (t !== Meta.WindowType.NORMAL) {
            return false;
        }

        if (metaWindow.is_skip_taskbar?.() || metaWindow.is_skip_pager?.()) {
            return false;
        }

        if (metaWindow.is_override_redirect?.()) {
            return false;
        }

        // if (metaWindow.is_on_all_workspaces?.())
        //     return false;

        return true;
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

                if (!this.isTrackableWindow(metaWindow)) {
                    cleanup();
                    return GLib.SOURCE_REMOVE;
                }

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
