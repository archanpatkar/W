const { sum } = require("styp");
const { equal } = require("saman");
const { toktypes, n_chmap } = require("./tokens");
const ast = require("./ast");
const SymbolTable = require("./symtab");

const cop = ["==","!=","<",">",">=","<=","and","or"];

// Define Types
const types = sum("Types", {
    i32: [],
    i64: [],
    f32: [],
    f64: [],
    char: [],
    bool: [],
    void: [],
    func: ["params","ret"],
    intConstant: [],
    floatConstant: []
});

// Temporary hack
types.i32.__proto__ = { __proto__:types.i32.__proto__ };
types.bool.__proto__ = { __proto__:types.bool.__proto__ };
types.f32.__proto__ = { __proto__:types.f32.__proto__ };
types.i64.__proto__ = { __proto__:types.i64.__proto__ };
types.f64.__proto__ = { __proto__:types.f64.__proto__ };
types.intConstant.__proto__ = { __proto__:types.intConstant.__proto__ };
types.floatConstant.__proto__ = { __proto__:types.floatConstant.__proto__ };
// ----

// For future: change the logic to allow simple coersion
types.i32.__proto__.equal = function(type) {
    return types.i32.is(type) || types.intConstant.is(type);
}

types.bool.__proto__.equal = function(type) {
    return types.i32.is(type) || types.intConstant.is(type);
}

types.i64.__proto__.equal = function(type) {
    return types.i64.is(type) || types.intConstant.is(type);
}

types.f32.__proto__.equal = function(type) {
    return types.f32.is(type) || types.floatConstant.is(type) || types.intConstant.is(type);
}

types.f64.__proto__.equal = function(type) {
    return types.f64.is(type) || types.floatConstant.is(type) || types.intConstant.is(type);
}

types.intConstant.__proto__.equal = function(type) {
    return types.intConstant.is(type) || type.equal(this);
}

types.floatConstant.__proto__.equal = function(type) {
    return types.floatConstant.is(type) || type.equal(this);
}

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
        func: () => {},//["params","ret"]
        intConstant: () => "integer value",
        floatConstant: () => "float value"
    });
    return type;
}

function typeMismatchError(type1,type2) {
    throw new Error(`Cannot match ${typeStr(type1)} with ${typeStr(type2)}`)
}

class TypeChecker {
    constructor(tok) {
        this.tok = tok;
        this.global = new SymbolTable(null);
        this.functabs = {};
    }

    addDec(name,type,kind,env=this.global) {
        if(env.isDefined(name)) {
            // if(!equal(type,env.type(name))) {
                // Do something here for overloading!
            // }
            throw new Error("Cannot redefine a declaration");
        }
        else env.define(name,type,kind);
    }

    hoistDecs(darr,env) {
        for(let dec of darr) {
            // console.log("haul it!");
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

    // Will expand this in the future
    lvalue(l,env) {
        if(ast.identifier.is(l) && lk.includes(env.kind(l.name))) return;
        throw new Error("Not a l-value");
    }

    // For future
    // rvalue() {
    // }

    chConstant(n,env) {
        return n.type;
    }

    chIdentifier(i,env) {
        return env.type(i.name);
    }

    isInteger(type) {
        if(types.i32.is(type)) return true;
        if(types.i64.is(type)) return true;
        if(types.intConstant.is(type)) return true;
        return false
    }

    isFloat(type) {
        if(types.f32.is(type)) return true;
        if(types.f64.is(type)) return true;
        if(types.floatConstant.is(type)) return true;
        return false
    }

    chConstDef(cd,env) {
        // this.addDec(cd.iden,cd.type,"constant",env);
        const asgn = this.check(cd.expr,env);
        if(cd.type.equal(asgn)) return cd.type;
        typeMismatchError(cd.type,asgn);
    }

    chLetDef(ld,env) {
        // this.addDec(ld.iden,ld.type,"var",env);
        if(ld.expr) {
            const asgn = this.check(ld.expr,env);
            if(ld.type.equal(asgn)) return ld.type;
            typeMismatchError(ld.type,asgn);
        }
        return ld.type;
    }

    chParamDef(p,env) {
        this.addDec(p.name,p.type,"arg",env);
        return p.type;
    }

    chFuncDef(f,env) {
        let nenv = new SymbolTable(env);
        nenv.func = f.name;
        nenv.ftype = env.type(f.name);
        this.functabs[f.name] = nenv;
        const params = f.params.map(p => this.check(p,nenv));
        const body = this.check(f.body,nenv);
        return env.type(f.name);
    }

    chIfDef(id,env) {
        const type = this.check(id.exp,env);
        if(types.i32.is(type) || types.intConstant.is(type)) {
            const body1 = this.check(id.body1,env);
            if(id.body2) this.check(id.body2,env);
            return;
        }
        typeMismatchError("Expected i32",type)
    }

    chWhileDef(wd,env) {
        const type = this.check(wd.exp,env);
        if(types.i32.is(type) || types.intConstant.is(type)) return this.check(wd.body,env);
        typeMismatchError("Expected i32",type)
    }

    chDoWhileDef(dw,env) {
        const type = this.check(dw.exp,env);
        if(types.i32.is(type) || types.intConstant.is(type)) return this.check(dw.body,env);
        typeMismatchError("Expected i32",type);
    }

    chForDef(fd,env) {
        const ft = fd.exps.map(e => e?this.check(e,env):e);
        if(types.i32.is(ft[1]) || types.intConstant.is(ft[1])) return this.check(fd.body,env);
        typeMismatchError("Expected i32",type);
    }

    equalT(t1,t2) {
        if(
            Array.isArray(t1) && 
            Array.isArray(t2) && 
            (t1.length === t2.length)
        ) {
            for(let i in t1) {
                if(!t1[i].equal(t2[i])) return false;
            }
            return true;
        }
        return false;
    }

    chFuncCall(fc,env) {
        const fun = this.check(fc.func,env);
        if(types.func.is(fun)) {
            const atypes = fc.args.map(a => this.check(a,env));
            // add type constant checking clause
            if(fun.params.length === 0 && atypes.length === 0 ||
               this.equalT(fun.params,atypes)) return fun.ret;
            throw new Error("Param mismatch");
        }
        throw new Error("Not a function!");
    }

    chUnary(op,env) {
      const type = this.check(op.right,env);
      if(types.is(op.op)) {
        op.type.push(type);
        return op.op;
      }
      if(this.isInteger(type) || this.isFloat(type)) {
          if(op.op.value === "not") {
              if(types.i32.is(type) || types.intConstant.is(type)) {
                op.type.push(type);
                return types.i32;
              }
              typeMismatchError("bool or i32", type);
          }
          op.type.push(type);
          return type;
      }
      typeMismatchError("integer or float", type);
    }

    chBinary(op,env) {
        // put assgn in parseTerm
        if(op.op.value === n_chmap.ASSGN) {
            this.lvalue(op.left,env);
            // const lk = 
            // if(lk) {
                const lt = this.check(op.left,env);
                const rv = this.check(op.right,env);
                // add literal typing clause
                if(lt.equal(rv)) {
                    op.type.push(rv);
                    return rv;
                } 
                typeMismatchError(lt,rv);
            // }
            // throw new Error("Not a l-value");
        }
        else {
            const ls = this.check(op.right,env);
            const rs = this.check(op.left,env);
            // add literal typing clause
            if(ls.equal(rs)) {
                op.type.push(rs);
                if(cop.includes(op.op.value)) return types.i32;
                return rs;
            }
            typeMismatchError(ls,rs);
        }
    }

    chReturnDef(rd,env) {
        const type = env.type(env.func).ret;
        if(!types.void.is(type) && rd.exp) {
            const et = this.check(rd.exp,env);
            if(type.equal(et)) return et;
            typeMismatchError(type,et);
        }
    }

    chExportDef(ed,env) {
        return this.check(Array.isArray(ed.decl)?ed.decl[0]:ed.decl, env);
    }

    chBlockDef(b,env) {
        return b.statements.map(s => this.check(s,env));
    }

    check(ast,env=this.global) {
        if(Array.isArray(ast)) {
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
            dowhiledef: dw => this.chDoWhileDef(dw,env), // ["exp","body"]
            fordef: fd => this.chForDef(fd,env), // ["exps","body"]
            block: b => this.chBlockDef(b,env), // ["statements"]
            binary: op => this.chBinary(op,env), // ["op","left","right"]
            unary: op => this.chUnary(op,env), // ["op","right"]
            funccall: fc => this.chFuncCall(fc,env), // ["func","args"]
            returndef: rd => this.chReturnDef(rd,env), // ["exp"]
            exportdef: ed => this.chExportDef(ed,env), // ["decl"]
            break: () => 0,
            continue: () => 0
        });
    }
}

module.exports = { types, TypeChecker };