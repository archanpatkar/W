class SymbolTable {
    constructor(parent) {
        this.parent = parent;
        this.table = {};
        this.kindcount = {};
    }

    reset() {
        this.table = {};
        this.kindcount = {};
    }

    total(kind) {
        const n = this.kindcount[kind];
        return n?n:0;
    }

    calc(kind) {
        if(!this.kindcount[kind]) this.kindcount[kind] = 0;
        return this.kindcount[kind]++;
    }

    isDefined(name) {
        if(this.table[name]) return true;
        // else if(this.parent) return this.parent.isDefined(name);
        return false;
    }

    define(name,type,kind) {
        this.table[name] = {
            type: type,
            kind: kind,
            index: this.calc(kind)
        };
        if(kind === "var" || kind === "constant") {
            this.table[name].absIndex = this.calc("abs");
        }
    }

    allkind(kind) {
        const buff = [];
        for(let key in this.table) {
            if(this.table[key].kind === kind) buff.push(this.table[key])
        }
        return buff;
    }

    kind(name) {
        if(!this.table[name]) {
            if(this.parent) return this.parent.kind(name);
            else throw new Error("No such symbol!");
        }
        return this.table[name].kind;
    }

    type(name) {
        if(!this.table[name]) {
            if(this.parent) return this.parent.type(name);
            else throw new Error("No such symbol!");
        }
        return this.table[name].type;
    }

    index(name) {
        if(!this.table[name]) {
            if(this.parent) return this.parent.index(name);
            else throw new Error("No such symbol!");
        }
        return this.table[name].index;
    }

    absIndex(name) {
        if(!this.table[name]) {
            if(this.parent) return this.parent.index(name);
            else throw new Error("No such symbol!");
        }
        return this.table[name].absIndex !== undefined?this.table[name].absIndex:this.table[name].index;
    }
}

module.exports = SymbolTable;