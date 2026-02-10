export class BaseNode {
    constructor(id, type) {
        this.id = id;
        this.type = type;

        /** @type {{x:number,y:number,width:number,height:number}|null} */
        this.workArea = null;

        /** @type {BaseNode|null} */
        this.parent = null;
    }

    toSerializable() {
        return {
            id: this.id,
            type: this.type,
            workArea: this.workArea ? {...this.workArea} : null,
            parentId: this.parent?.id || null,  // Store ID only!
        };
    }

    restore(data) {

        log(`[narrow-space] restoring node with id: ${data.id} and type: ${data.type}`);
        this.id = data.id;
        this.type = data.type;
        this.workArea = data.workArea;
        this.parentId = data.parentId;  // Store temp ID
        // parent object gets linked LATER
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
