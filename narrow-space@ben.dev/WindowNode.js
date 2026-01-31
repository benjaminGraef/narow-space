import Meta from 'gi://Meta';
const { global } = globalThis;
import Clutter from 'gi://Clutter';

import { BaseNode } from './BaseNode.js';

/**
 * Leaf node controlling a GNOME Meta.Window.
 * Invariant: this.id === Meta.Window.get_id()
 */
export class WindowNode extends BaseNode {
    /**
     * @param {number} metaWindowId Meta.Window.get_id()
     */
    constructor(metaWindowId) {
        super(metaWindowId, 'window');

        /** @type {Meta.Window|null} */
        this.cachedWindow = null;

        this.visible = false;
    }


    addLeaf(node) { return false; } // a window cannot have a leafe
    removeLeaf(nodeOrId) { return false; }

    /**
     * Resolve Meta.Window by id.
     * After locking, the metaWindow is not the same anymore, but the id is.
     * So we get the window by the id here again.
     */
    resolveWindow() {
        const w = this.cachedWindow;
        if (w && !w.destroyed && w.get_id?.() === this.id) {
            return w;
        }

        for (const actor of global.get_window_actors()) {
            const mw = actor?.meta_window;
            if (mw && mw.get_id?.() === this.id) {
                this.cachedWindow = mw;
                return mw;
            }
        }


        log(`[narrow-space] Could not resolve window`);
        this.cachedWindow = null;
        return null;
    }

    setMetaWindow(metaWindow) {
        if (!metaWindow) {
            return false;
        }

        if (metaWindow.get_id?.() !== this.id) {
            return false;
        }

        this.cachedWindow = metaWindow;
        return true;
    }

    getMetaWindow() {
        return this.resolveWindow();
    }

    setWorkArea(area) {
        super.setWorkArea(area);

        const win = this.resolveWindow();
        if (!win || !area) {
            return;
        }

        // Ignore special windows
        if (win.is_override_redirect?.() || win.skip_taskbar) {
            return;
        }

        try {
            const flags = win.get_maximized?.();
            if (flags)
                win.unmaximize(Meta.MaximizeFlags.BOTH);
        } catch { }

        try {
            win.move_resize_frame(
                true,   // user_op
                area.x,
                area.y,
                area.width,
                area.height
            );
        } catch (e) {
            logError(e, `[narrow-space] move_resize_frame failed for window ${this.id}`);
        }
    }

    focus() {
        const win = this.resolveWindow();
        if (!win) {
            return false;
        }


        try {
            if (win.minimized) {
                win.unminimize();
            }

            win.activate(global.get_current_time());
            // set the mouse pointer ot the middle of the window
            const seat = Clutter.get_default_backend().get_default_seat();
            seat.warp_pointer(this.workArea.x + this.workArea.width / 2, this.workArea.y + this.workArea.height / 2);
            return true;
        } catch (e) {
            logError(e, `[narrow-space] activate failed for window ${this.id}`);
            return false;
        }
    }

    show() {
        this.visible = true;

        const win = this.resolveWindow();
        if (!win) {
            return;
        }

        try {
            if (win.minimized)
                win.unminimize();
        } catch (e) {
            logError(e);
        }
    }

    hide() {
        this.visible = false;

        const win = this.resolveWindow();
        if (!win) {
            return;
        }

        try {
            win.minimize();
        } catch (e) {
            logError(e);
        }
    }
}


