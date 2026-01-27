
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

    setNextMode() {
        if(this.focusedLeaf.setNextMode) {
            this.focusedLeaf.setNextMode();
            return;
        }

        if (this.currentMode === this.modes.VERTICAL) {
            this.currentMode = this.modes.HORIZONTAL;
        }
        else if (this.currentMode === this.modes.HORIZONTAL) {
            this.currentMode = this.modes.STACKING;
        }
        else {
            this.currentMode = this.modes.VERTICAL;
        }

        this.show();
    }

    // resize the currently active leaf node, depeding on the mode
    resize(deltaPx) {
        if (this.focusedLeaf.resize) {
            this.focusedLeaf.resize(deltaPx);
            return;
        }

        const n = this.leafs.length;
        if (n <= 1 || !this.focusedLeaf || !this.workArea) {
            return;
        }

        if (this.currentMode === this.modes.STACKING) {
            return;
        }

        this.ensureWeights();

        const leafs = this.leafs;
        const idx = leafs.indexOf(this.focusedLeaf);
        if (idx < 0) {
            return;
        }

        const isVertical = (this.currentMode === this.modes.VERTICAL);
        const totalPx = isVertical ? this.workArea.width : this.workArea.height;
        const weights = isVertical ? this._weightsX : this._weightsY;

        // Make sure weights exist
        this.normalizeMissingWeights(leafs, weights);

        // Choose neighbor index: prefer right/down, else left/up
        let j = idx + 1;
        if (j >= n) {
            j = idx - 1;
        }
        if (j < 0) {
            return;
        }

        const idA = leafs[idx].getId();
        const idB = leafs[j].getId();

        // Convert pixel delta to weight delta relative to current sum
        let sum = 0;
        for (const leaf of leafs) {
            sum += weights.get(leaf.getId());
        }

        const pxPerWeight = totalPx / sum;
        if (!(pxPerWeight > 0)) {
            return;
        }

        let dW = deltaPx / pxPerWeight;

        const MIN_PX = 80;
        const minW = MIN_PX / pxPerWeight;

        let wA = weights.get(idA);
        let wB = weights.get(idB);

        // We want: wA' = wA + dW, wB' = wB - dW
        // Calmp dW so wA' >= minW and wB' >= minW
        const maxGrowA = (wB - minW);
        const maxShrinkA = (wA - minW);

        if (dW > maxGrowA) {
            dW = maxGrowA;
        }
        if (-dW > maxShrinkA) {
            dW = -maxShrinkA;
        }

        wA = Math.max(minW, wA + dW);
        wB = Math.max(minW, wB - dW);

        weights.set(idA, wA);
        weights.set(idB, wB);

        this.show();
    }


    addLeaf(leaf) {
        if (!leaf || this.leafs.includes(leaf)) {
            return false;
        }

        leaf.setParent?.(this);
        this.leafs.push(leaf);

        if (!this.focusedLeaf) {
            this.focusedLeaf = leaf;
            this.lastFocusedLeaf = null;
        }

        return true;
    }

    moveWindow(direction) {
        if (this.focusedLeaf.moveWindow) {
            this.focusedLeaf.moveWindow(direction);
            return;
        }

        if (this.currentMode == this.modes.STACKING) {
            return;
        }
        const leaf = this.getLeafInDirection(direction);
        if (!leaf) {
            return;
        }

        const otherIx = this.leafs.indexOf(leaf);
        const currentIx = this.leafs.indexOf(this.focusedLeaf);

        const tmp = this.leafs[otherIx];
        this.leafs[otherIx] = this.leafs[currentIx];
        this.leafs[currentIx] = tmp;

        this.show();
    }

    joinWindow(direction) {
        log(`[SeaSpace] joining window in direction: ${direction}`);

        if (this.currentMode === this.modes.STACKING) {
            return;
        }

        if (!this.focusedLeaf) {
            return;
        }

        const otherLeaf = this.getLeafInDirection(direction);
        if (!otherLeaf) {
            return;
        }

        if (otherLeaf === this.focusedLeaf) {
            return;
        }

        // Create nested workspace that will hold both leaves
        const nested = new WorkspaceNode(`join:${this.getId()}:${Date.now()}`);
        nested.setWorkArea(this.workArea);
        nested.addLeaf(otherLeaf);
        nested.addLeaf(this.focusedLeaf);

        this.removeLeaf(otherLeaf, /*show*/ false);
        this.removeLeaf(this.focusedLeaf, /*show*/ false);

        this.leafs.push(nested);
        nested.setParent?.(this);

        this.lastFocusedLeaf = this.focusedLeaf;
        this.focusedLeaf = nested;

        this.show();
    }


    removeLeaf(leafOrId, show = true) {
        const idx = this.leafs.findIndex(l =>
            l === leafOrId ||
            l.getId() === leafOrId ||
            l.id === leafOrId
        );

        if (idx < 0) {
            return false;
        }

        const removed = this.leafs[idx];
        const wasFocused = removed === this.focusedLeaf;

        this.leafs.splice(idx, 1);

        if (show) {
            removed.hide?.();
        }

        if (removed.getParent?.() === this) {
            removed.setParent?.(null);
        }

        if (this.lastFocusedLeaf === removed) {
            this.lastFocusedLeaf = null;
        }

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
        if (!center) {
            return undefined;
        }

        let best = undefined;
        let bestDist2 = Infinity;

        for (const leaf of this.leafs) {
            if (leaf === this.focusedLeaf) {
                continue;
            }

            const other = leaf.getCenter?.();
            if (!other) {
                continue;
            }

            const dx = other.x - center.x;
            const dy = other.y - center.y;

            let ok = false;
            switch (direction) {
                case 'left': ok = dx < 0; break;
                case 'right': ok = dx > 0; break;
                case 'up': ok = dy < 0; break;
                case 'down': ok = dy > 0; break;
            }
            if (!ok) {
                continue;
            }

            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist2) {
                bestDist2 = d2;
                best = leaf;
            }
        }

        return best;
    }

    focus() {
        if (!this.focusedLeaf) {
            if (this.leafs.length > 0) {
                this.focusedLeaf = this.leafs[0]
            }
        }
        this.focusedLeaf.focus();
    }

    // returns true if the moveFocus was performed, false otherwise
    moveFocus(direction) {
        const n = this.leafs.length;
        if (n === 0) {
            return false;
        }

        if (!this.focusedLeaf || !this.leafs.includes(this.focusedLeaf)) {
            this.focusedLeaf = this.leafs[0];
            this.lastFocusedLeaf = null;
        }

        // check first if the current leaf is a workspace in itself
        if (this.focusedLeaf.moveFocus) {
            if(this.focusedLeaf.moveFocus(direction)) {
                return true;
            }
        }

        if (this.currentMode === this.modes.STACKING) {
            let idx = this.leafs.indexOf(this.focusedLeaf);
            if (idx < 0) idx = 0;

            const next = (direction === 'left' || direction === 'up');
            idx = next ? ((idx + 1) % n) : (idx === 0 ? (n - 1) : (idx - 1));

            this.lastFocusedLeaf = this.focusedLeaf;
            this.focusedLeaf = this.leafs[idx];

            this.focusedLeaf?.focus();
            this.show();
            return true;
        }

        const leaf = this.getLeafInDirection(direction);
        if (!leaf) {
            this.focusedLeaf?.moveFocus?.(direction);
            return false;
        }

        this.lastFocusedLeaf = this.focusedLeaf;
        this.focusedLeaf = leaf;
        this.focusedLeaf?.focus();

        return true;
    }

    ensureWeights() {
        if (!this._weightsX) {
            this._weightsX = new Map();
        }
        if (!this._weightsY) {
            this._weightsY = new Map();
        }
    }

    normalizeMissingWeights(axisLeafs, weights) {
        // Ensure every leaf has a weight > 0
        for (const leaf of axisLeafs) {
            const id = leaf.getId();
            const w = weights.get(id);
            if (!(w > 0)) {
                weights.set(id, 1);
            }
        }
    }

    show() {
        const leafs = this.leafs;
        const n = leafs.length;
        if (n === 0 || !this.workArea) return false;

        this.ensureWeights();

        if (this.currentMode === this.modes.STACKING) {
            const overlap = this.STACKED_OVERLAP;
            const ordered = this.focusedLeaf
                ? [...leafs.filter(l => l !== this.focusedLeaf), this.focusedLeaf]
                : [...leafs];

            for (let i = 0; i < ordered.length; i++) {
                const leaf = ordered[i];
                const x = this.workArea.x + overlap * i;
                const y = this.workArea.y + overlap * i;
                const width = Math.max(1, this.workArea.width - overlap * i);
                const height = Math.max(1, this.workArea.height - overlap * i);
                leaf.setWorkArea({ x, y, width, height });
                leaf.show?.();
            }
            this.focusedLeaf?.focus?.();
            return true;
        }

        if (this.currentMode === this.modes.VERTICAL) {
            return this.showWeightedVertical(leafs);
        }

        if (this.currentMode === this.modes.HORIZONTAL) {
            return this.showWeightedHorizontal(leafs);
        }

        return false;
    }

    showWeightedVertical(leafs) {
        const MIN_PX = 80;
        const totalW = this.workArea.width;
        const totalH = this.workArea.height;

        const weights = this._weightsX;
        this.normalizeMissingWeights(leafs, weights);

        let sum = 0;
        for (const leaf of leafs) {
            sum += weights.get(leaf.getId());
        }

        // compute pixel widths using largest remainder
        const parts = leafs.map((leaf, i) => {
            const id = leaf.getId();
            const w = weights.get(id);
            const exact = (w / sum) * totalW;
            return { leaf, id, i, base: Math.floor(exact), rem: exact - Math.floor(exact) };
        });

        let used = parts.reduce((a, p) => a + p.base, 0);
        let remaining = totalW - used;
        parts.slice().sort((a, b) => b.rem - a.rem).forEach(p => {
            if (remaining > 0) {
                p.base++;
                remaining--;
            }
        });

        for (const p of parts) {
            p.base = Math.max(MIN_PX, p.base);
        }

        // fix overflow caused by clamping
        let overflow = parts.reduce((a, p) => a + p.base, 0) - totalW;
        while (overflow > 0) {
            // shrink the largest panes above MIN_PX first
            parts.sort((a, b) => b.base - a.base);
            let shrunk = false;
            for (const p of parts) {
                const can = p.base - MIN_PX;
                if (can <= 0) {
                    continue;
                }
                const dec = Math.min(can, overflow);
                p.base -= dec;
                overflow -= dec;
                shrunk = true;
                if (overflow === 0) {
                    break;
                }
            }
            if (!shrunk) {
                break;
            }
        }

        // restore original order
        parts.sort((a, b) => a.i - b.i);

        let x = this.workArea.x;
        for (const p of parts) {
            p.leaf.setWorkArea({ x, y: this.workArea.y, width: p.base, height: totalH });
            p.leaf.show();
            x += p.base;
        }

        this.focusedLeaf?.focus?.();
        return true;
    }

    showWeightedHorizontal(leafs) {
        const MIN_PX = 80;
        const totalW = this.workArea.width;
        const totalH = this.workArea.height;

        const weights = this._weightsY;
        this.normalizeMissingWeights(leafs, weights);

        let sum = 0;
        for (const leaf of leafs) {
            sum += weights.get(leaf.getId());
        }

        const parts = leafs.map((leaf, i) => {
            const id = leaf.getId();
            const w = weights.get(id);
            const exact = (w / sum) * totalH;
            return { leaf, id, i, base: Math.floor(exact), rem: exact - Math.floor(exact) };
        });

        let used = parts.reduce((a, p) => a + p.base, 0);
        let remaining = totalH - used;
        parts.slice().sort((a, b) => b.rem - a.rem).forEach(p => {
            if (remaining > 0) {
                p.base++;
                remaining--;
            }
        });

        for (const p of parts) {
            p.base = Math.max(MIN_PX, p.base);
        }

        let overflow = parts.reduce((a, p) => a + p.base, 0) - totalH;
        while (overflow > 0) {
            parts.sort((a, b) => b.base - a.base);
            let shrunk = false;
            for (const p of parts) {
                const can = p.base - MIN_PX;
                if (can <= 0) {
                    continue;
                }
                const dec = Math.min(can, overflow);
                p.base -= dec;
                overflow -= dec;
                shrunk = true;
                if (overflow === 0) {
                    break;
                }
            }
            if (!shrunk) {
                break;
            }
        }

        parts.sort((a, b) => a.i - b.i);

        let y = this.workArea.y;
        for (const p of parts) {
            p.leaf.setWorkArea({ x: this.workArea.x, y, width: totalW, height: p.base });
            p.leaf.show();
            y += p.base;
        }

        this.focusedLeaf?.focus?.();
        return true;
    }


    hide() {
        for (const leaf of this.leafs) {
            leaf.hide?.();
        }
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
