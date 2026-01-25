import Meta from 'gi://Meta';
const { global } = globalThis;

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
        super(metaWindowId);

        /** @type {Meta.Window|null} */
        this.cachedWindow = null;

        this.visible = false;
    }


    addLeaf(node) { return false; }
    removeLeaf(nodeOrId) { return false; }

    /**
     * Resolve Meta.Window by id.
     * Safe across lock/unlock & actor rebuilds.
     */
    resolveWindow() {
        const w = this.cachedWindow;
        if (w && !w.destroyed && w.get_id?.() === this.id)
            return w;

        for (const actor of global.get_window_actors()) {
            const mw = actor?.meta_window;
            if (mw && mw.get_id?.() === this.id) {
                this.cachedWindow = mw;
                return mw;
            }
        }

        this.cachedWindow = null;
        return null;
    }

    setMetaWindow(metaWindow) {
        if (!metaWindow)
            return false;

        if (metaWindow.get_id?.() !== this.id)
            return false;

        this.cachedWindow = metaWindow;
        return true;
    }

    getMetaWindow() {
        return this.resolveWindow();
    }

    setWorkArea(area) {
        super.setWorkArea(area);

        const win = this.resolveWindow();
        if (!win || !area)
            return;

        // Ignore special windows
        if (win.is_override_redirect?.() || win.skip_taskbar)
            return;

        try {
            const flags = win.get_maximized?.();
            if (flags)
                win.unmaximize(Meta.MaximizeFlags.BOTH);
        } catch {}

        try {
            win.move_resize_frame(
                true,   // user_op
                area.x,
                area.y,
                area.width,
                area.height
            );
        } catch (e) {
            logError(e, `[SeaSpace] move_resize_frame failed for window ${this.id}`);
        }
    }

    focus() {
        const win = this.resolveWindow();
        if (!win)
            return false;

        try {
            if (win.minimized)
                win.unminimize();

            win.activate(global.get_current_time());
            return true;
        } catch (e) {
            logError(e, `[SeaSpace] activate failed for window ${this.id}`);
            return false;
        }
    }

    show() {
        this.visible = true;

        const win = this.resolveWindow();
        if (!win)
            return;

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
        if (!win)
            return;

        try {
            win.minimize();
        } catch (e) {
            logError(e);
        }
    }
}


