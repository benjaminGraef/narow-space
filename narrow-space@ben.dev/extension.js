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
import { KeybindingConfigLoader } from './KeybindingConfigLoader.js';


export default class narrowSpaceExtension extends Extension {
    async enable() {
        // panel indicator
        this.indicator = new PanelMenu.Button(0.0, 'narrow-space');
        this.label = new St.Label({
            text: '1',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.indicator.add_child(this.label);
        this.indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem('narrow-space', { reactive: false }));
        this.indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.paused = false;

        this.pauseItem = new PopupMenu.PopupSwitchMenuItem('Paused', this.paused);
        this.pauseItem.connect('toggled', (item, state) => {
            this.paused = state;
            if (!this.paused) {
                this.updateWorkAreas();
            }
        });

        this.indicator.menu.addMenuItem(this.pauseItem);
        Main.panel.addToStatusArea('narrow-space-indicator', this.indicator);

        // keybindings 
        this.settings = this.getSettings('org.gnome.shell.extensions.narrow-space');
        this.registerKeybindings();

        this.isServiceModeOn = false;
        this.workspaces = new Map();
        this.floatingWindows = new Array();

        this.keyConfig = new KeybindingConfigLoader(this.settings, this.workspaces);
        await this.keyConfig.load(true);

        this.restoreWorkspaces();
        this.restoreFloatingWindows();

        if (this.workspaces.size > 0) {
            this.activeWorkspace = this.workspaces.keys().next().value;
        } else {
            log(`[narrow-space] no workspaces defined!`);
        }

        this.windowCreatedId = global.display.connect('window-created', (_display, metaWindow) => {
            this.onWindowCreated(metaWindow);
        });

        this.focusChangedId = global.display.connect('notify::focus-window', () => {
            const win = global.display.focus_window;
            if (!win) {
                return;
            }

            this.onWindowFocused(win.get_id());
        });

        this.grabOpEndId = global.display.connect('grab-op-end', (_display, metaWindow, op) => {
            this.windowGrabEnd(metaWindow.get_id());
        });

        this.updateWorkAreas();
    }

    getAllMetaWindowIds() {
        const wm = global.workspace_manager;
        let ids = [];

        for (let i = 0; i < wm.get_n_workspaces(); i++) {
            const ws = wm.get_workspace_by_index(i);
            ids.push(...ws.list_windows().map(w => w.get_id()));
        }

        return ids;
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

        this.storeWorkspaces();
        this.storeFloatingWindows();

        this.floatingWindows = null;
        this.keyConfig = null;
        this.workspaces = null;
        this.settings = null;
    }

    createNodeFromData(data) {
        switch (data.type) {
            case 'workspace':
                return new WorkspaceNode(data.id);
            case 'window':
                return new WindowNode(data.id);
            default:
                log(`[narrow-space] Unknown node type: ${data.type}, skipping`);
                return null;
        }
    }

    fillLeafsOfWorkspace(workspace, workspaceLeafs, existingWindows) {
        for (const leaf of workspaceLeafs) {
            const node = this.createNodeFromData(leaf);
            if (!node) {
                continue;
            }

            if (node.type === 'workspace') {
                if (leaf.leafs?.length > 0) {
                    this.fillLeafsOfWorkspace(node, leaf.leafs, existingWindows);
                }
            } else if (node.type === 'window') {
                if (!existingWindows.includes(leaf.id)) {
                    continue;
                }
            } else {
                continue;
            }

            node.restore(leaf);
            node.parent = workspace;
            workspace.leafs.push(node);
        }
    }

    storeWorkspaces() {
        const serializableWorkspaces = Array.from(this.workspaces.entries())
            .map(([id, ws]) => ({
                mapId: id,
                workspaceData: ws.toSerializable()
            }));

        this.settings.set_string('data', JSON.stringify(serializableWorkspaces));
    }

    restoreWorkspaces() {
        const serializedData = this.settings.get_string('data') || '[]'
        const saved = JSON.parse(serializedData || '[]');
        if (!saved.length) {
            return;
        }
        const idToNode = new Map();


        const existingWindows = this.getAllMetaWindowIds();
        for (const entry of saved) {
            const ws = this.workspaces.get(entry.mapId);
            if (ws === undefined)
                continue;

            ws.restore(entry.workspaceData);
            // at this point, parent reference and leafs are still missing
            if (entry.workspaceData.leafs?.length > 0) {
                this.fillLeafsOfWorkspace(ws, entry.workspaceData.leafs, existingWindows);
            }
        }

        this.settings.reset('data');
    }

    restoreFloatingWindows() {
        const savedIds = this.settings.get_strv('floating-windows');
        this.floatingWindows = savedIds.map(id => parseInt(id, 10));
        this.settings.reset('floating-windows');
    }

    storeFloatingWindows() {
        this.settings.set_strv(
            'floating-windows',
            this.floatingWindows.map(w => String(w))
        );
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
            this.workspaces.get(this.activeWorkspace)?.addLeaf(leaf);
            this.workspaces.get(this.activeWorkspace)?.show();
            this.floatingWindows.splice(idx, 1);
        } else {
            if (this.workspaces.get(this.activeWorkspace).removeLeaf(metaWindow.get_id())) {
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

        const wsRealId = this.workspaces.get(workspaceId).getId();
        if (workspaceId === this.activeWorkspace) {
            if (this.isServiceModeOn) {
                this.label.set_text(String(wsRealId) + " Se");
            }
            else {
                this.label.set_text(String(wsRealId));
            }
            return;
        }

        this.activeWorkspace = workspaceId;
        if (this.isServiceModeOn) {
            this.label.set_text(String(wsRealId) + " Se");
        } else {
            this.label.set_text(String(wsRealId));
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
            log(`[narrow-space] window already in this workspace`);
            return;
        }

        const activeWin = this.getActiveWindow();
        if (!activeWin) {
            log('[narrow-space] no focused window');
            return;
        }

        const activeWinId = activeWin.get_id();

        const fromWs = this.workspaces.get(this.activeWorkspace);
        const toWs = this.workspaces.get(workspaceId);

        if (!fromWs || !toWs) {
            log(`[narrow-space] workspace model missing (from=${this.activeWorkspace}, to=${workspaceId})`);
            return;
        }

        const wasPresent = fromWs.removeLeaf(activeWinId, /*show*/ false);
        if (!wasPresent) {
            log(`[narrow-space] window ${activeWinId} not found in workspace ${this.activeWorkspace}`);
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
