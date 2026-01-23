import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { Workspace } from "./workspace.js";
import { BINDINGS } from './keyBinding.js';

log('[SeaSpace] extension.js LOADED - BUILD=2026-01-17_1705');

export default class SeaSpaceExtension extends Extension {
    enable() {
        log('[SeaSpace] enable');
        this.indicator = new PanelMenu.Button(0.0, 'SeaSpace');
        try {
            this.label = new St.Label({
                text: '1',
                y_align: Clutter.ActorAlign.CENTER,
            });
        } catch (e) {
            logError(e, '[SeaSpace] lable failed');
        }
        this.indicator.add_child(this.label);
        Main.panel.addToStatusArea('seaspace-indicator', this.indicator);

        try {
            this.settings = this.getSettings('org.gnome.shell.extensions.seaspace');
            this.registerKeybindings();
        } catch (e) {
            logError(e, '[SeaSpace] getSettings failed');
        }

        this.activeWorkspace = 1;
        this.workspaces = new Map();
        this.workspaces.set('S', new Workspace('S'));
        this.workspaces.set('T', new Workspace('T'));
        this.workspaces.set('B', new Workspace('B'));
        this.workspaces.set('M', new Workspace('M'));
        for (let i = 1; i < 10; i++) {
            this.workspaces.set(i, new Workspace(i));
        }

        for (const workspace of this.workspaces.values()) {
            const area = Main.layoutManager.getWorkAreaForMonitor(0);
            const panelHeight = Main.panel.height;
            workspace.setWorkArea({ x: area.x, y: area.y + panelHeight, width: area.width, height: area.height - panelHeight });
        }
        log("[SeaSpace] done setting work areas");


        this.windowCreatedId = global.display.connect(
            'window-created',
            (_display, metaWindow) => this.onWindowCreated(metaWindow)
        );

        this.focusChangedId = global.display.connect('notify::focus-window', () => {
            const win = global.display.get_focus_window(); // Meta.Window | null
            if (!win)
                return;

            this.onWindowFocused(win); // call your handler if you want
            log(`[SeaSpace] Focus changed -> ${win.get_title()} (id=${win.get_id()})`);
        });

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

    changeWorkspaceMode() {
        log(`[SeaSpace] change mode key handler`);
        this.workspaces.get(this.activeWorkspace).setNextMode();
    }

    unregisterKeybindings() {
        for (const b of BINDINGS) {
            Main.wm.removeKeybinding(b.name);
        }
    }

    onWindowFocused(metaWindow) {
        for (const workspace of this.workspaces.values()) {
            if(workspace.setFocusedWindow(metaWindow)) {
                // window was in that workspace, done
                log(`[SeaSpace] focused window on workspace ${workspace.id}`);
                return;
            }
        }

        log(`[SeaSpace] Could not focus: Window not found in any workspace`);
    }

    moveFocus(direction) {
        log(`[SeaSpace] moveing focus to window on ${direction}`);
        this.workspaces.get(this.activeWorkspace).moveFocus(direction);
    }

    switchToWorkspace(workspaceId) {
        log(`[SeaSpace] moveing to to workspace ${workspaceId}`);
        this.activeWorkspace = workspaceId;
        this.label.set_text(String(this.activeWorkspace));
        for (const [id, workspace] of this.workspaces) {
            if (id === this.activeWorkspace) {
                workspace.showWindows();
            } else {
                workspace.doNotShowWindows();
            }
        }
    }

    moveWindowToWorkspace(workspaceId) {
        log(`[SeaSpace] moveing focused window to workspace ${workspaceId}`);

        if (workspaceId === this.activeWorkspace) {
            log(`[SeaSpace] window already in this workspace`);
            return;
        }

        const activeWin = this.getActiveWindow();
        if (activeWin === null) {
            log('[SeaSpace] no focused window');
            return;
        }

        const activeWinId = activeWin.get_id();

        const fromWs = this.workspaces.get(this.activeWorkspace);
        const toWs = this.workspaces.get(workspaceId);

        if (!fromWs) {
            log(`[SeaSpace] active workspace model missing: ${this.activeWorkspace}`);
            return;
        }
        if (!toWs) {
            log(`[SeaSpace] target workspace model missing: ${workspaceId}`);
            return;
        }

        const movedWindow = fromWs.removeWindow(activeWin);
        if (!movedWindow) {
            log(`[SeaSpace] window ${activeWin} not found in workspace ${this.activeWorkspace}`);
            return;
        }
        fromWs.showWindows();

        log(`[SeaSpace] moving window ${activeWin} to workspace ${workspaceId}`);
        toWs.addWindow(movedWindow);
    }

    getActiveWindow() {
        return global.display.get_focus_window?.() ?? global.display.focus_window ?? null;
    }


    disable() {
        log('[SeaSpace] disable');

        this.unregisterKeybindings();
        this.settings = null;

        if (this.windowCreatedId) {
            global.display.disconnect(this.windowCreatedId);
            this.windowCreatedId = 0;
        }

        if (this.indicator) {
            this.indicator.destroy();
            this.indicator = null;
        }

        if (this.focusChangedId) {
            global.display.disconnect(this.focusChangedId);
            this.focusChangedId = 0;
        }
    }

    onWindowCreated(metaWindow) {
        let waitActorId = 0;

        waitActorId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const actor = metaWindow.get_compositor_private?.();
            if (!actor)
                return GLib.SOURCE_CONTINUE; // keep waiting

            // Actor exists now → proceed once
            this.attachFirstFrameHandler(metaWindow, actor);
            return GLib.SOURCE_REMOVE;
        });
    }

    attachFirstFrameHandler(metaWindow, actor) {
        let idleId = 0;
        let firstFrameId = 0;
        let unmanagedId = 0;

        const type = metaWindow.get_window_type?.();
        // if (type !== Meta.WindowType.NORMAL)
        // {
        //     log(" [SeaSpace] windo not normal skipping");
        //     return;
        // }

        const cleanupHandlers = () => {
            if (idleId) GLib.Source.remove(idleId);
            if (firstFrameId) actor.disconnect(firstFrameId);
            if (unmanagedId) metaWindow.disconnect(unmanagedId);
        };

        const onUnmanaged = () => {
            for (const ws of this.workspaces.values()) {
                ws.removeWindow(metaWindow);
            }
        };

        unmanagedId = metaWindow.connect('unmanaged', () => {
            onUnmanaged();
            cleanupHandlers();
        });


        firstFrameId = actor.connect('first-frame', () => {
            // Defer again so Mutter finishes its own placement logic
            let tries = 0;

            idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                const r = metaWindow.get_frame_rect();

                // Some windows take a bit; avoid infinite loop
                if ((r.width === 0 || r.height === 0) && tries++ < 50)
                    return GLib.SOURCE_CONTINUE;

                try {
                    const ws = this.workspaces.get(this.activeWorkspace);
                    if (!ws) {
                        return GLib.SOURCE_REMOVE;
                    }
                    ws.addWindow(metaWindow);
                    ws.showWindows();
                } catch (e) {
                    logError(e, '[SeaSpace] _tileWorkspace crashed');
                }

                return GLib.SOURCE_REMOVE;
            });
        });
    }
}


