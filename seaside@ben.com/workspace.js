import Meta from 'gi://Meta';
const { global } = globalThis;


export class Workspace {
    constructor(id) {
        this.modes = Object.freeze({
            VERTICAL: 'vertical',
            HORIZONTAL: 'horizontal',
            STACKING: 'stacking'
        });

        this.id = id;
        this.windows = new Map();
        this.area = null;
        this.focusedWindowId = null;
        this.currentMode = this.modes.VERTICAL;
    }

    getId() {
        return this.id;
    }

    setMode(newMode) {
        if (this.currentMode === newMode) {
            return;
        }

        log(`[SeaSpace] Switching mode to ${newMode}`);
        this.currentMode = newMode;
        this.showWindows();
    }

    setNextMode() {
        if (this.currentMode === this.modes.VERTICAL) {
            this.currentMode = this.modes.HORIZONTAL;
        } else if (this.currentMode === this.modes.HORIZONTAL) {
            this.currentMode = this.modes.STACKING;
        } else {
            this.currentMode = this.modes.VERTICAL
        }
        log(`[SeaSpace] Switching to next mode ${this.currentMode}`);
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

    getWindowLeftOfCurrentlyActive() {
        const center = this.getCenterOfWindow(this.focusedWindowId);
        if (!center) return undefined;

        for (const [id, win] of this.windows) {
            if (id === this.focusedWindowId) {
                continue;
            }

            const otherCenter = this.getCenterOfWindow(id);
            if (!otherCenter) {
                continue;
            }

            const dx = center.x - otherCenter.x; // positive => other is left
            if (dx > 0) {
                log(`[SeaSpace] found window to the left`);
                return { id: id, win: win };
            };
        }

        log(`[SeaSpace] found no window to the left`);
        return undefined;
    }

    getCenterOfWindow(windowId) {
        const win = this.windows.get(windowId);
        if (!win) {
            log(`[SeaSpace] Cannot get center of window, id does not exist: ${windowId}`);
            return undefined;
        }

        const rect = win.get_frame_rect();
        return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
        };
    }

    getWindowInDirection(direction) {
        const center = this.getCenterOfWindow(this.focusedWindowId);
        if (!center) {
            return undefined;
        }

        for (const [id, win] of this.windows) {
            if (id === this.focusedWindowId) {
                continue;
            }

            const other = this.getCenterOfWindow(id);
            if (!other) {
                continue;
            }

            switch (direction) {
                case "left":
                    if (other.x < center.x)
                        return { id, win };
                    break;

                case "right":
                    if (other.x > center.x)
                        return { id, win };
                    break;

                case "up":
                    if (other.y < center.y)
                        return { id, win };
                    break;

                case "down":
                    if (other.y > center.y)
                        return { id, win };
                    break;
            }
        }

        return undefined;
    }

    moveFocus(direction) {
        const result = this.getWindowInDirection(direction);
        if (!result) {
            log(`[SeaSpace] no window found in direction ${direction}`);
            return;
        }

        result.win.activate(global.get_current_time());
        this.focusedWindowId = result.id;
    }

    setFocusedWindow(windowId) {
        if (this.focusedWindowId === windowId) {
            return true;
        }

        if (this.windows.has(windowId)) {
            log(`[SeaSpace] focused window with id ${windowId}`);
            this.focusedWindowId = windowId;
            return true;
        }

        return false;
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

        let width = 0;
        let height = 0;
        let xOffset = 0;
        let yOffset = 0;
        if (this.currentMode === this.modes.VERTICAL) {
            width = Math.floor(this.area.width / numberOfWindows);
            xOffset = width;
            height = this.area.height;
        } else if (this.currentMode === this.modes.HORIZONTAL) {
            height = Math.floor(this.area.height / numberOfWindows);
            yOffset = height;
            width = this.area.width;
        } else {
            // in this mode we stack tha windows on top of each other with a bit of overlap
            //TODO: implement me
        }

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
            const x = this.area.x + xOffset * i;
            const y = this.area.y + yOffset * i;

            log(`[SeaSpace] putting window ${win.get_id()} to x: ${x} y: ${y}, width: ${width}`);
            // 4) `user_op=true` often makes Mutter accept the move/resize
            win.move_resize_frame(true, x, y, width, height);

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

