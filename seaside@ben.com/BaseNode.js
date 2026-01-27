export class BaseNode {
    constructor(id) {
        this.id = id;

        /** @type {{x:number,y:number,width:number,height:number}|null} */
        this.workArea = null;

        /** @type {BaseNode|null} */
        this.parent = null;
    }

    // ---- identity -------------------------------------------------------------

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

    resize(deltaSize) {

    }

    getCenter() {
        if (!this.workArea)
            return undefined;

        return {
            x: this.workArea.x + this.workArea.width / 2,
            y: this.workArea.y + this.workArea.height / 2,
        };
    }

    // ---- tree operations ------------------------------------------------------

    addLeaf(_node) {
        return false;
    }

    removeLeaf(_nodeOrId) {
        return false;
    }

    // ---- focus navigation -----------------------------------------------------

    focus() {
        return undefined;
    }

    // ---- visibility -----------------------------------------------------------

    show() {}
    hide() {}
}
