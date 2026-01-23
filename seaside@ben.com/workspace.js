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
        this.focusedWindow = null;  // Meta.Window | null
        this.currentMode = this.modes.VERTICAL;
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

        if (this.focusedWindow === null)
            this.focusedWindow = win;
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
        if (!center)
            return undefined;

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
        const win = this.getWindowInDirection(direction);
        if (!win) {
            log(`[SeaSpace] no window found in direction ${direction}`);
            return;
        }

        win.activate(global.get_current_time());
        this.focusedWindow = win;
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

    removeWindow(win) {
        const idx = this.windows.indexOf(win);
        if (idx === -1) {
            log(`[SeaSpace] window not found in workspace ${this.id}`);
            return null;
        }

        this.windows.splice(idx, 1);

        // if this was focused, choose a new focused window (or null)
        if (this.focusedWindow === win) {
            this.focusedWindow = this.windows.length ? this.windows[Math.min(idx, this.windows.length - 1)] : null;
        }

        // minimize the window to not show it again
        win.minimize();

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
        const numberOfWindows = this.windows.length;
        if (numberOfWindows === 0)
            return false;

        if (!this.area) {
            log(`[SeaSpace] showWindows: no work area set for workspace ${this.id}`);
            return false;
        }

        log(`[SeaSpace] show window ${numberOfWindows} of workspace ${this.id}`);

        let width = 0;
        let height = 0;
        let xStep = 0;
        let yStep = 0;

        if (this.currentMode === this.modes.VERTICAL) {
            width = Math.floor(this.area.width / numberOfWindows);
            xStep = width;
            height = this.area.height;
        } else if (this.currentMode === this.modes.HORIZONTAL) {
            height = Math.floor(this.area.height / numberOfWindows);
            yStep = height;
            width = this.area.width;
        } else {
            // stacking: basic overlap (simple implementation)
            width = this.area.width;
            height = this.area.height;
            xStep = 30;
            yStep = 30;
        }

        for (let i = 0; i < this.windows.length; i++) {
            const win = this.windows[i];

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
            const x = this.area.x + xStep * i;
            const y = this.area.y + yStep * i;

            log(`[SeaSpace] putting window ${win.get_id()} to x: ${x} y: ${y}, width: ${width}`);
            win.move_resize_frame(true, x, y, width, height);

            if (win === this.focusedWindow) {
                win.activate(global.get_current_time());
            }
        }

        return true;
    }

    doNotShowWindows() {
        log(`[SeaSpace] do not show window of workspace ${this.id}`);
        for (const win of this.windows) {
            win.minimize();
        }
    }
}
