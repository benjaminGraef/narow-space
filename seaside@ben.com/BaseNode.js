export class BaseNode {
    constructor(id, type) {
        this.id = id;
        this.type = type;

        /** @type {{x:number,y:number,width:number,height:number}|null} */
        this.workArea = null;

        /** @type {BaseNode|null} */
        this.parent = null;
    }

    // ---- identity -------------------------------------------------------------

    isWindow() {
        return this.type === 'window';
    }

    isWorkspace() {
        return this.type === 'workspace';
    }

    getId() {
        return this.id;
    }

    getParent() {
        return this.parent;
    }

    setParent(parent) {
        this.parent = parent;
    }


    // ---- layout ---------------------------------------------------------------

    setWorkArea(area) {
        // area: { x, y, width, height }
        this.workArea = area;
    }

    getCenter() {
        if (!this.workArea) {
            return undefined;
        }

        return {
            x: this.workArea.x + this.workArea.width / 2,
            y: this.workArea.y + this.workArea.height / 2,
        };
    }

    getWorkArea() {
        if (!this.workArea) {
            return undefined;
        }

        return this.workArea
    }

    // ---- tree operations ------------------------------------------------------

    addLeaf(_node) {
        return false;
    }

    removeLeaf(_nodeOrId) {
        return false;
    }

    // ---- visibility -----------------------------------------------------------

    show() {}
    hide() {}
}
