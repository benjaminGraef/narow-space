import Meta from 'gi://Meta';
const { global } = globalThis;


export class Workspace {
    constructor(id) {
        this.id = id;
        this.windows = new Map();
        this.area = null;
        this.focusedWindowId = null;
    }

    getId() {
        return this.id;
    }

    setWorkArea(area) {
        this.area = area;
    }

    addWindow(window) {
        log(`[SeaSpace] Adding window to workspace ${this.id}`);

        this.windows.set(window.get_id(), window);
        if (this.focusedWindowId === null) {
            this.focusedWindowId = window.get_id();
        }
    }
    moveFocus(direction) {
        switch(direction) {
            case "left":
                break;
            case "right":
                break;
            case "up":
                break;
            case "down":
                break;
            default:
                log(`[SeaSpace] unknown direction to move to`);
        }
    }

    removeWindow(windowId) {
        if (!this.windows.has(windowId)) {
            log(`[SeaSpace] window not found in workspace ${this.id}`);
            return null;
        }

        const retVal = this.windows.get(windowId);
        this.windows.delete(windowId);

        // minimize the window to not show it again
        retVal.minimize();

        return retVal;
    }

    // returns Meta.MaximizeFlags bitmask or 0
    getMaximizeFlags(win) {
        // Newer API
        if (typeof win.get_maximize_flags === 'function')
            return win.get_maximize_flags();

        // Older API (common)
        if (typeof win.get_maximized === 'function')
            return win.get_maximized();

        // Newer API alternative (boolean full-maximize)
        if (typeof win.is_maximized === 'function')
            return win.is_maximized() ? Meta.MaximizeFlags.BOTH : 0;

        return 0;
    }

    isFullscreen(win) {
        // Newer / common API
        if (typeof win.is_fullscreen === 'function')
            return win.is_fullscreen();

        // Older Mutter API
        if (typeof win.get_fullscreen === 'function')
            return win.get_fullscreen();

        return false;
    }

    // returns false if no windows are present
    showWindows() {
        const numberOfWindows = this.windows.size;
        if (numberOfWindows === 0) {
            return false;
        }

        log(`[SeaSpace] show window ${numberOfWindows} of workspace ${this.id}`);
        const width = Math.floor(this.area.width / numberOfWindows);


        let i = 0;
        for (const [id, win] of this.windows) {
            // 1) If minimized, unminimize first
            if (win.minimized) {
                log(`[SeaSpace] unminimizing window`);
                win.unminimize();
            }

            // 2) If maximized/fullscreen, you usually can't resize it
            const flags = this.getMaximizeFlags(win);
            if (flags !== 0) {
                log(`[SeaSpace] unmaximizing window for flags ${flags}`);
                win.unmaximize(Meta.MaximizeFlags.BOTH);
            }
            if (this.isFullscreen(win)) {
                log(`[SeaSpace] unmakeFullscreen window`);
                win.unmake_fullscreen();
            }

            // 3) Use work area offsets (x/y), not (0,0)
            const x = this.area.x + width * i;
            const y = this.area.y;

            log(`[SeaSpace] putting window ${win.get_id()} to x: ${x} y: ${y}, width: ${width}`);
            // 4) `user_op=true` often makes Mutter accept the move/resize
            win.move_resize_frame(true, x, y, width, this.area.height);

            if (this.focusedWindowId === id) {
                win.activate(global.get_current_time());
            }
            i++;
        }

        return true;
    }

    doNotShowWindows() {
        log(`[SeaSpace] do not show window of workspace ${this.id}`);
        for (const window of this.windows.values()) {
            window.minimize();
        }
    }
}

