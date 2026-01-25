
import { BaseNode } from './BaseNode.js';

export class WorkspaceNode extends BaseNode {
    constructor(id) {
        super(id);

        this.modes = Object.freeze({
            VERTICAL: 'vertical',
            HORIZONTAL: 'horizontal',
            STACKING: 'stacking',
        });

        /** @type {BaseNode[]} */
        this.leafs = [];

        this.currentMode = this.modes.VERTICAL;

        /** @type {BaseNode|null} */
        this.focusedLeaf = null;

        /** @type {BaseNode|null} */
        this.lastFocusedLeaf = null;

        this.STACKED_OVERLAP = 20;
    }

    setMode(newMode) {
        if (this.currentMode === newMode)
            return;

        this.currentMode = newMode;
        this.show();
    }

    setNextMode() {
        if (this.currentMode === this.modes.VERTICAL)
            this.currentMode = this.modes.HORIZONTAL;
        else if (this.currentMode === this.modes.HORIZONTAL)
            this.currentMode = this.modes.STACKING;
        else
            this.currentMode = this.modes.VERTICAL;

        this.show();
    }

    addLeaf(leaf) {
        if (!leaf || this.leafs.includes(leaf))
            return false;

        leaf.setParent?.(this);
        this.leafs.push(leaf);

        if (!this.focusedLeaf) {
            this.focusedLeaf = leaf;
            this.lastFocusedLeaf = null;
        }

        return true;
    }

    removeLeaf(leafOrId, show = true) {
        const idx = this.leafs.findIndex(l =>
            l === leafOrId ||
            l.getId?.() === leafOrId ||
            l.id === leafOrId
        );

        if (idx < 0)
            return false;

        const removed = this.leafs[idx];
        const wasFocused = removed === this.focusedLeaf;

        this.leafs.splice(idx, 1);

        if (show)
            removed.hide?.();

        if (removed.getParent?.() === this)
            removed.setParent?.(null);

        if (this.lastFocusedLeaf === removed)
            this.lastFocusedLeaf = null;

        if (this.leafs.length === 0) {
            this.focusedLeaf = null;
            this.lastFocusedLeaf = null;
            return true;
        }

        if (wasFocused) {
            if (this.lastFocusedLeaf && this.leafs.includes(this.lastFocusedLeaf)) {
                this.focusedLeaf = this.lastFocusedLeaf;
            } else {
                this.focusedLeaf = this.leafs[Math.min(idx, this.leafs.length - 1)];
            }
            this.lastFocusedLeaf = null;
        }

        this.show();
        return true;
    }

    getLeafInDirection(direction) {
        const center = this.focusedLeaf?.getCenter?.();
        if (!center)
            return undefined;

        let best = undefined;
        let bestDist2 = Infinity;

        for (const leaf of this.leafs) {
            if (leaf === this.focusedLeaf)
                continue;

            const other = leaf.getCenter?.();
            if (!other)
                continue;

            const dx = other.x - center.x;
            const dy = other.y - center.y;

            let ok = false;
            switch (direction) {
                case 'left':  ok = dx < 0; break;
                case 'right': ok = dx > 0; break;
                case 'up':    ok = dy < 0; break;
                case 'down':  ok = dy > 0; break;
            }
            if (!ok)
                continue;

            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist2) {
                bestDist2 = d2;
                best = leaf;
            }
        }

        return best;
    }

    moveFocus(direction) {
        const n = this.leafs.length;
        if (n === 0)
            return;

        if (!this.focusedLeaf || !this.leafs.includes(this.focusedLeaf)) {
            this.focusedLeaf = this.leafs[0];
            this.lastFocusedLeaf = null;
        }

        if (this.currentMode === this.modes.STACKING) {
            let idx = this.leafs.indexOf(this.focusedLeaf);
            if (idx < 0) idx = 0;

            const next = (direction === 'left' || direction === 'up');
            idx = next ? ((idx + 1) % n) : (idx === 0 ? (n - 1) : (idx - 1));

            this.lastFocusedLeaf = this.focusedLeaf;
            this.focusedLeaf = this.leafs[idx];

            this.focusedLeaf?.focus?.();
            this.show();
            return;
        }

        const leaf = this.getLeafInDirection(direction);
        if (!leaf)
            return;

        this.lastFocusedLeaf = this.focusedLeaf;
        this.focusedLeaf = leaf;
        this.focusedLeaf?.focus?.();
    }

    show() {
        const leafs = this.leafs;
        const n = leafs.length;

        if (n === 0 || !this.workArea)
            return false;

        if (this.currentMode === this.modes.STACKING) {
            const overlap = this.STACKED_OVERLAP;

            // focused last => top
            const ordered = this.focusedLeaf
                ? [...leafs.filter(l => l !== this.focusedLeaf), this.focusedLeaf]
                : [...leafs];

            for (let i = 0; i < ordered.length; i++) {
                const leaf = ordered[i];

                const x = this.workArea.x + overlap * i;
                const y = this.workArea.y + overlap * i;
                const width = Math.max(1, this.workArea.width - overlap * i);
                const height = Math.max(1, this.workArea.height - overlap * i);

                leaf.setWorkArea?.({ x, y, width, height });
                leaf.show?.();
            }

            return true;
        }

        const layout = this.computeLayout(n, this.currentMode);

        for (let i = 0; i < n; i++) {
            const leaf = leafs[i];

            const x = this.workArea.x + layout.xStep * i;
            const y = this.workArea.y + layout.yStep * i;

            leaf.setWorkArea?.({ x, y, width: layout.width, height: layout.height });
            leaf.show?.();
        }

        return true;
    }

    hide() {
        for (const leaf of this.leafs)
            leaf.hide?.();
    }

    computeLayout(n, mode) {
        let width = this.workArea.width;
        let height = this.workArea.height;
        let xStep = 0;
        let yStep = 0;

        if (mode === this.modes.VERTICAL) {
            width = Math.max(1, Math.floor(this.workArea.width / n));
            height = this.workArea.height;
            xStep = width;
        } else if (mode === this.modes.HORIZONTAL) {
            width = this.workArea.width;
            height = Math.max(1, Math.floor(this.workArea.height / n));
            yStep = height;
        }

        return { width, height, xStep, yStep };
    }

    setFocusedLeaf(leafId) {
        if (this.focusedLeaf.id === leafId) {
            return true;
        }

        for (const leaf of this.leafs) {

            if (leaf.id === leafId) {
                log(`[SeaSpace] focused window ${leafId} ?? '(unknown id)'}`);
                this.focusedLeaf = leaf;
                return true;
            }
        }

        return false;
    }
}
