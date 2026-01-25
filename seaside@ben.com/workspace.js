import Meta from 'gi://Meta';
const { global } = globalThis;

export class Workspace {
    constructor(id) {
        this.modes = Object.freeze({
            VERTICAL: 'vertical',
            HORIZONTAL: 'horizontal',
            STACKING: 'stacking',
        });

        this.id = id;
        this.windows = [];          // Array<Meta.Window>
        this.area = null;
        this.lastFocusedWindow = null
        this.focusedWindow = null;  // Meta.Window | null
        this.currentMode = this.modes.VERTICAL;
        this.STACKED_OVERLAP = 30; // pixel overlap in stacked mode
    }

    getId() {
        return this.id;
    }

    setMode(newMode) {
        if (this.currentMode === newMode)
            return;

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
            this.currentMode = this.modes.VERTICAL;
        }

        log(`[SeaSpace] Switching to next mode ${this.currentMode}`);
        this.showWindows();
    }

    setWorkArea(area) {
        this.area = area;
    }

    addWindow(win) {
        log(`[SeaSpace] Adding window to workspace ${this.id}`);

        // prevent duplicates (optional but usually helpful)
        if (this.windows.includes(win))
            return;

        this.windows.push(win);

        if (this.focusedWindow === null) {
            this.focusedWindow = win;
        }
    }

    getCenterOfWindow(win) {
        if (!win) {
            log(`[SeaSpace] Cannot get center of window, window is null/undefined`);
            return undefined;
        }

        const rect = win.get_frame_rect();
        return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
        };
    }

    getWindowInDirection(direction) {
        const center = this.getCenterOfWindow(this.focusedWindow);
        if (!center) {
            return undefined;
        }

        for (const win of this.windows) {
            if (win === this.focusedWindow)
                continue;

            const other = this.getCenterOfWindow(win);
            if (!other)
                continue;

            switch (direction) {
                case 'left':
                    if (other.x < center.x) return win;
                    break;
                case 'right':
                    if (other.x > center.x) return win;
                    break;
                case 'up':
                    if (other.y < center.y) return win;
                    break;
                case 'down':
                    if (other.y > center.y) return win;
                    break;
            }
        }

        return undefined;
    }

    moveFocus(direction) {
        if (this.currentMode === this.modes.STACKING) {
            const len = this.windows.length;
            if (len === 0)
                return;

            // in stacking we use left/right or up/down for switching to the next/prev window
            let index = this.windows.indexOf(this.focusedWindow);

            if (index === -1) {
                log(`[SeaSpace] focused window not in workspace`);
                this.focusedWindow = this.windows[0];
                index = 0;
            }

            if (direction === 'left' || direction === 'up') {
                index = (index + 1) % len; // next
            } else {
                index = (index === 0) ? (len - 1) : (index - 1); // prev
            }

            log(`[SeaSpace] new index ${index}`);
            this.lastFocusedWindow = this.focusedWindow;
            this.focusedWindow = this.windows[index];
            this.showWindows();
            return;
        }

        const win = this.getWindowInDirection(direction);
        if (!win) {
            log(`[SeaSpace] no window found in direction ${direction}`);
            return;
        }

        win.activate(global.get_current_time());
        this.focusedWindow = win;
    }

    moveFocusedWindow(direction) {

    }

    setFocusedWindow(win) {
        if (this.focusedWindow === win)
            return true;

        if (this.windows.includes(win)) {
            log(`[SeaSpace] focused window ${win.get_id?.() ?? '(unknown id)'}`);
            this.focusedWindow = win;
            return true;
        }

        return false;
    }

    removeWindow(win, show) {
        const idx = this.windows.indexOf(win);
        if (idx === -1) {
            log(`[SeaSpace] window not found in workspace ${this.id}`);
            return null;
        }

        this.windows.splice(idx, 1);

        // if this was focused, choose a new focused window (or null)
        if (this.focusedWindow === win) {
            this.focusedWindow = this.windows.length ? this.windows[Math.min(idx, this.windows.length - 1)] : null;
        } else if (this.lastFocusedWindow === win) {
            this.lastFocusedWindow = null;
        }

        // minimize the window to not show it again
        log(`[SeaSpace] removed window from workspace ${this.id}`);
        if (show) {
            win.minimize();
        }

        return win;
    }

    // returns Meta.MaximizeFlags bitmask or 0
    getMaximizeFlags(win) {
        if (typeof win.get_maximize_flags === 'function')
            return win.get_maximize_flags();

        if (typeof win.get_maximized === 'function')
            return win.get_maximized();

        if (typeof win.is_maximized === 'function')
            return win.is_maximized() ? Meta.MaximizeFlags.BOTH : 0;

        return 0;
    }

    isFullscreen(win) {
        if (typeof win.is_fullscreen === 'function')
            return win.is_fullscreen();

        if (typeof win.get_fullscreen === 'function')
            return win.get_fullscreen();

        return false;
    }

    // returns false if no windows are present
    showWindows() {
        const windows = this.windows;
        const n = windows.length;

        if (n === 0) {
            return false;
        }

        if (!this.area) {
            log(`[SeaSpace] showWindows: no work area set for workspace ${this.id}`);
            return false;
        }

        log(`[SeaSpace] show window ${n} of workspace ${this.id}, with area space x: ${this.area.x}, y: ${this.area.y}, width: ${this.area.width}, height: ${this.area.height}`);

        const mode = this.currentMode;
        const stacked = (mode === this.modes.STACKING);

        for (const win of windows) {
            this.prepareWindowForTiling(win);
        }

        if (!stacked) {
            const layout = this.computeLayout(n, mode);

            for (let i = 0; i < n; i++) {
                const win = windows[i];

                const x = this.area.x + layout.xStep * i;
                const y = this.area.y + layout.yStep * i;

                log(`[SeaSpace] putting window ${win.get_id()} to x: ${x} y: ${y}, width: ${layout.width} height: ${layout.height}`);
                win.move_resize_frame(true, x, y, layout.width, layout.height);

                if (win === this.focusedWindow)
                {
                    win.activate(global.get_current_time());
                }
            }

            return true;
        }

        // STACKING (card offset): focused on top, lastFocused behind it, visible on right+bottom
        const back = this.lastFocusedWindow ?? null;
        const front = this.focusedWindow ?? null;
        const overlap = this.STACKED_OVERLAP ?? 30;

        // Back window: full size
        if (back && back !== front) {
            back.move_resize_frame(
                true,
                this.area.x,
                this.area.y,
                this.area.width,
                this.area.height
            );
        }

        // Front window: slightly smaller + shifted up/left
        if (front) {
            front.move_resize_frame(
                true,
                this.area.x,
                this.area.y,
                Math.max(1, this.area.width - overlap),
                Math.max(1, this.area.height - overlap)
            );
            front.activate(global.get_current_time());
        }

        return true;
    }

    computeLayout(n, mode) {
        let width = this.area.width;
        let height = this.area.height;
        let xStep = 0;
        let yStep = 0;

        if (mode === this.modes.VERTICAL) {
            width = Math.max(1, Math.floor(this.area.width / n));
            height = this.area.height;
            xStep = width;
            yStep = 0;
        } else if (mode === this.modes.HORIZONTAL) {
            width = this.area.width;
            height = Math.max(1, Math.floor(this.area.height / n));
            xStep = 0;
            yStep = height;
        }

        return { width, height, xStep, yStep };
    }

    prepareWindowForTiling(win) {
        if (win.minimized) {
            log(`[SeaSpace] unminimizing window`);
            win.unminimize();
        }

        const flags = this.getMaximizeFlags(win);
        if (flags !== 0) {
            log(`[SeaSpace] unmaximizing window for flags ${flags}`);
            win.unmaximize(Meta.MaximizeFlags.BOTH);
        }

        if (this.isFullscreen(win)) {
            log(`[SeaSpace] unmakeFullscreen window`);
            win.unmake_fullscreen();
        }
    }

    doNotShowWindows() {
        for (const win of this.windows) {
            win.minimize();
        }
    }
}
