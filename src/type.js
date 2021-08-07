const { sum } = require("styp");
const { equal } = require("saman");
const { toktypes, n_chmap } = require("./tokens");
const ast = require("./ast");
const SymbolTable = require("./symtab");


const cop = ["==","<",">",">=","<=","and","or"];

// Define Types
const types = sum("Types", {
    i32: [],
    i64: [],
    f32: [],
    f64: [],
    char: [],
    bool: [],
    void: [],
    func: ["params","ret"]
});

const lk = ["arg","var"];

// Function type ~=~ Function signature
// function createFuncType() {}

function typeStr(type) {
    if(types.is(type)) return type.cata({
        i32: () => "i32",
        i64: () => "i64",
        f32: () => "f32",
        f64: () => "f64",
        char: () => "char",
        bool: () => "bool",
        void: () => "void",
        func: () => {}//["params","ret"]
    });
    if(toktypes.integer === type) return "integer value";
    if(toktypes.float === type) return "float value";
    return type;
}

function typeMismatchError(type1,type2) {
    throw new Error(`Cannot match ${typeStr(type1)} with ${typeStr(type2)}`)
}

class TypeChecker {
    constructor() {
        this.global = new SymbolTable(null);
        this.functabs = {};
    }

    addDec(name,type,kind,env=this.global) {
        if(env.isDefined(name)) {
            // if(!equal(type,env.type(name))) {
                // Do something here for overloading!
            // }
            // console.log("|---here!---|");
            // console.log(name);
            // console.log(env.table);
            throw new Error("Cannot redefine a declaration");
        }
        else env.define(name,type,kind);
    }

    hoistDecs(darr,env) {
        // console.log("Hoisting!");
        // console.log(darr);
        for(let dec of darr) {
            console.log("haul it!");
            console.log(dec.toString());
            if(ast.exportdef.is(dec)) dec = dec = Array.isArray(dec.decl)?dec.decl[0]:dec.decl;;
            if(ast.constdef.is(dec)) {
                this.addDec(dec.iden,dec.type,"constant",env);
            }
            else if(ast.letdef.is(dec)) {
                this.addDec(dec.iden,dec.type,"var",env);
            }
            else if(ast.funcdef.is(dec)) {
                const ftype = types.func(dec.params.map(p => p.type),dec.rettype);
                this.addDec(dec.name,ftype,"function",env);
            }
        }
    }

    lvalue(name,env) {
        // console.log("in l value")
        // console.log(env.table);
        // console.log(name);
        // console.log(env.kind(name));
        return lk.includes(env.kind(name));
    }

    // rvalue(val) {
    // }

    chConstant(n,env) {
        if(n.type)
        return n.type;
    }

    chIdentifier(i,env) {
        return env.type(i.name);
    }

    isInteger(type) {
        if(types.i32.is(type)) return true;
        if(types.i64.is(type)) return true;
        if(type === toktypes.integer) return true;
        return false
    }

    isFloat(type) {
        if(types.f32.is(type)) return true;
        if(types.f64.is(type)) return true;
        if(type === toktypes.float) return true;
        return false
    }

    chConstDef(cd,env) {
        // this.addDec(cd.iden,cd.type,"constant",env);
        const asgn = this.check(cd.expr,env);
        // || 
        //    (this.isInteger(cd.type) && asgn === toktypes.integer) || 
        //    (this.isFloat(cd.type) && asgn === toktypes.float)
        if(this.equalT(cd.type,asgn)) return cd.type;
        typeMismatchError(cd.type,asgn);
    }

    chLetDef(ld,env) {
        // this.addDec(ld.iden,ld.type,"var",env);
        if(ld.expr) {
            const asgn = this.check(ld.expr,env);
            // equal(ld.type,asgn) || 
            // (this.isInteger(ld.type) && asgn === toktypes.integer) || 
            // (this.isFloat(ld.type) && asgn === toktypes.float)
            if(this.equalT(ld.type,asgn)) return ld.type;
            typeMismatchError(ld.type,asgn);
        }
        return ld.type;
    }

    chParamDef(p,env) {
        this.addDec(p.name,p.type,"arg",env);
        return p.type;
    }

    // chBlockDef(bl,env) {

    // }

    chFuncDef(f,env) {
        let nenv = new SymbolTable(env);
        nenv.func = f.name;
        nenv.ftype = env.type(f.name);
        this.functabs[f.name] = nenv;
        const params = f.params.map(p => this.check(p,nenv));
        // const ftype = types.func(params,f.rettype);
        // this.addDec(f.name,ftype,"function",env);
        // console.log(nenv.table);
        const body = this.check(f.body,nenv);
        return env.type(f.name);
    }

    chIfDef(id,env) {
        const type = this.check(id.exp,env);
        // this.isInteger(type) || this.isFloat(type)
        // console.log("$_$_$_$_$")
        // console.log(type)
        if(types.i32.is(type) || type === toktypes.integer) {
            const body1 = this.check(id.body1,env);
            if(id.body2) this.check(id.body2,env);
            return;
        }
        typeMismatchError("i32",type)
    }

    chWhileDef(wd,env) {
        const type = this.check(wd.exp,env);
        // this.isInteger(type) || this.isFloat(type)
        if(types.i32.is(type) || type === toktypes.integer) return this.check(wd.body,env);
        typeMismatchError("i32",type)
    }

    equalT(t1,t2) {
        if(Array.isArray(t1) && Array.isArray(t2)) {
            if(t1.length === t2.length)
                return t1.reduce((prev,curr,i) => prev && curr && t2[i],true)
            return false;
        }
        return this.isInteger(t1) && this.isInteger(t2) ||
        this.isFloat(t1) && this.isFloat(t2)
    }

    chFuncCall(fc,env) {
        const fun = this.check(fc.func,env);
        if(types.func.is(fun)) {
            const atypes = fc.args.map(a => this.check(a,env));
            // console.log(fun.params)
            // console.log(atypes);
            // add type constant checking clause
            if(fun.params.length === 0 && atypes.length === 0 ||
               this.equalT(fun.params,atypes)) return fun.ret;
            throw new Error("Param mismatch");
        }
        throw new Error("Not a function!");
    }

    chUnary(op,env) {
      const type = this.check(op.right,env);
      if(this.isInteger(type) || this.isFloat(type)) {
          op.type.push(type);
          return type;
      }
      typeMismatchError("integer or float", type);
    }

    chBinary(op,env) {
        // put assgn in parseTerm
        // console.log
        if(op.op.value === n_chmap.ASSGN) {
            // console.log("!!!_here_!!! ")
            const lk = this.lvalue(op.left.name,env);
            // console.log(lk);
            if(lk) {
                const lt = this.check(op.right,env);
                const rv = this.check(op.left,env);
                // add literal typing clause
                if(this.isInteger(lt) && this.isInteger(rv) ||
                   this.isFloat(lt) && this.isFloat(rv)) {
                    op.type.push(rv);
                    return rv;
                   } 
                typeMismatchError(lt,rv);
            }
            throw new Error("Not a l-value");
        }
        else {
            const ls = this.check(op.right,env);
            const rs = this.check(op.left,env);
            // add literal typing clause
            // equal(ls,rs) ||
            // if()
            if(this.isInteger(ls) && this.isInteger(rs) || this.isFloat(ls) && this.isFloat(rs)) {
                op.type.push(rs);
                return rs;
            }
            typeMismatchError(ls,rs);
        }
    }

    chReturnDef(rd,env) {
        const type = env.type(env.func).ret;
        if(!types.void.is(type) && rd.exp) {
            const et = this.check(rd.exp,env);
            if(this.equalT(type,et)) return et;
            typeMismatchError(type,et);
        }
    }

    chExportDef(ed,env) {
        return this.check(Array.isArray(ed.decl)?ed.decl[0]:ed.decl, env);
    }

    check(ast,env=this.global) {
        // console.log("Passing |->")
        // console.log(ast.toString());
        // if(!ast) return "void";
        if(Array.isArray(ast)) {
            // console.log("here!");
            // console.log(ast)
            this.hoistDecs(ast,env);
            return ast.map(d => this.check(d,env));
        }
        return ast.cata({
            identifier: i => this.chIdentifier(i,env), // ["name"]
            constant: c => this.chConstant(c,env), // ["value", "type"]
            constdef: cd => this.chConstDef(cd,env), // ["iden", "type", "expr"]
            letdef: ld => this.chLetDef(ld,env), // ["iden", "type", "expr"]
            paramdef: p => this.chParamDef(p,env), // ["name", "type"]
            funcdef: f => this.chFuncDef(f,env), // ["name","params","rettype","body"]
            ifdef: id => this.chIfDef(id,env), // ["exp","body1","body2"]
            whiledef: wd => this.chWhileDef(wd,env), // ["exp","body"]
            block: ({ statements }) => statements.forEach(s => this.check(s,env)), // ["statements"]
            binary: op => this.chBinary(op,env), // ["op","left","right"]
            unary: op => this.chUnary(op,env), // ["op","right"]
            funccall: fc => this.chFuncCall(fc,env), // ["func","args"]
            returndef: rd => this.chReturnDef(rd,env), // ["exp"]
            exportdef: ed => this.chExportDef(ed,env) // ["decl"]
        });
    }
}

module.exports = { types, TypeChecker };