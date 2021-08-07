var binaryen = require("binaryen");
const Parser = require("./parser");
const ast = require("./ast");
const { types, TypeChecker } = require("./type");
const { toktypes, n_chmap, kw_map } = require("./tokens");

function random(min, max) {
  const r = Math.random() * (max - min) + min
  return Math.floor(r)
}

const iopmap = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div_s",
  "==": "eq",
  "!=": "ne",
  ">": "gt_s",
  ">=": "ge_s",
  "<": "lt_s",
  "<=": "le_s",
}

const fopmap = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "==": "eq",
  "!=": "ne",
  ">": "gt",
  ">=": "ge",
  "<": "lt",
  "<=": "le",
}

class CodeGen {
  constructor(ast, gst, fst) {
    this.init(ast, gst, fst);
    this.labels = {
      while:0
    };
  }

  genLabel(str,n=true) {
    if(!this.labels[str]) this.labels[str] = 0;
    return `${str}${n?this.labels[str]++:""}`;
  }

  init(ast, gst, fst) {
    this.ast = ast;
    this.global = gst;
    this.fun = fst;
    this.module = new binaryen.Module();
  }

  wasmType(type) {
    if (type === toktypes.integer) return this.module.i32;
    if (type === toktypes.float) return this.module.f32;
    return type.cata({
      i32: () => this.module.i32,
      i64: () => this.module.i64,
      f32: () => this.module.f32,
      f64: () => this.module.f64,
      bool: () => this.module.i32,
      char: () => {},
      void: () => {},
      func: () => {}
    });
  }

  wasmType2(type) {
    if (type === toktypes.integer) return binaryen.i32;
    if (type === toktypes.float) return binaryen.f32;
    return type.cata({
      i32: () => binaryen.i32,
      i64: () => binaryen.i64,
      f32: () => binaryen.f32,
      f64: () => binaryen.f64,
      bool: () => binaryen.i32,
      char: () => {},
      void: () => binaryen.none,
      func: () => {}
    });
  }

  // addDec(name,type,kind,env=this.global) {
  //     if(env.isDefined(name)) {
  // if(!equal(type,env.type(name))) {
  // Do something here for overloading!
  // }
  // console.log("|---here!---|");
  // console.log(name);
  // console.log(env.table);
  //         throw new Error("Cannot redefine a declaration");
  //     }
  //     else env.define(name,type,kind);
  // }

  // hoistDecs(darr,env) {
  // console.log("Hoisting!");
  // console.log(darr);
  // for(let dec of darr) {
  // console.log("haul it!");
  // console.log(dec);
  // if(ast.constdef.is(dec)) 
  // {
  //     this.addDec(dec.iden,dec.type,"constant",env);
  // }   
  // else if(ast.letdef.is(dec)) {
  //     this.addDec(dec.iden,dec.type,"var",env);
  // }
  // else if(ast.funcdef.is(dec)) {
  //     const ftype = types.func(dec.params.map(p => p.type),dec.rettype);
  //     this.addDec(dec.name,ftype,"function",env);
  // }
  //     }
  // }

  // lvalue(name,env) {
  // console.log("in l value")
  // console.log(env.table);
  // console.log(name);
  // console.log(env.kind(name));
  // return lk.includes(env.kind(name));
  // }

  // rvalue(val) {
  // }

  genConstant(n) {
    if (types.is(n.type)) {
      return this.wasmType(n.type).const(n.value)
    }
    return n;
  }

  genIdentifier(i, env) {
    if (env !== this.global && env.isDefined(i.name)) {
      const kind = env.kind(i.name);
      let index = env.absIndex(i.name);
      if (kind === "constant" || kind === "var") index += env.total("arg");
      return this.module.local.get(
        index,
        this.wasmType2(env.type(i.name))
      );
    }
    return this.module.global.get(i.name, this.wasmType2(env.type(i.name)));
  }

  isInteger(type) {
    if (types.i32.is(type)) return true;
    if (types.i64.is(type)) return true;
    if (type === toktypes.integer) return true;
    return false
  }

  isFloat(type) {
    if (types.f32.is(type)) return true;
    if (types.f64.is(type)) return true;
    if (type === toktypes.float) return true;
    return false
  }

  genConstDef(cd, env) {
    let init = this.subgen(cd.expr,env);
    if (ast.constant.is(init)) init = this.wasmType(cd.type).const(init.value);
    return this.module.local.set(
      env.total("arg") + env.absIndex(cd.iden),
      init
    );
  }


  genLetDef(ld, env) {
    if (ld.expr) {
      let init = this.subgen(ld.expr,env);
      if (ast.constant.is(init)) init = this.wasmType(ld.type).const(init.value);
      return this.module.local.set(
        env.total("arg") + env.absIndex(ld.iden),
        init
      );
    }
    return this.module.local.set(
      env.total("arg") + env.absIndex(ld.iden),
      this.wasmType(ld.type).const(0)
    );
  }

  chParamDef(p, env) {
    this.addDec(p.name, p.type, "arg", env);
    return p.type;
  }

  // chBlockDef(bl,env) {

  // }

  // chFuncDef(f, env) {
  //   let nenv = new SymbolTable(env);
  //   nenv.func = f.name;
  //   this.functabs[f.name] = nenv;
  //   const params = f.params.map(p => this.check(p, nenv));
    // const ftype = types.func(params,f.rettype);
    // this.addDec(f.name,ftype,"function",env);
    // console.log(nenv.table);
  //   const body = this.check(f.body, nenv);
  //   return env.type(f.name);
  // }

  genIfDef(id, env) {
    let cond = this.subgen(id.exp, env);
    if (ast.constant.is(cond)) init = this.wasmType(types.i32()).const(cond.value);
    // console.log("printing body")
    // this.module.block(null, id.body1.map(s => {
    //   let val = this.subgen(s, env);
    //   if (ast.constant.is(val)) val = this.wasmType(ftype.params[i]).const(val.value);
    //   return val;
    // }));
    let body1 = this.genBlock(id.body1,env);
    let body2 = id.body2 ? this.genBlock(id.body2,env) : undefined;
    return this.module.if(cond, body1, body2);
  }


  // console.log(binaryen.emitText(this.module.block(null,[
  //   this.module.loop(
  //     slabel,
  //     this.module.if(
  //       cond,
  //       this.genBlock(wd.body,env),
  //       this.module.br(elabel)
  //     )
  //   ),
  //   this.module.block(elabel,[])
  // ])));

  genWhileDef(wd, env) {
    const blabel = this.genLabel("wblockstart");
    const slabel = this.genLabel("whilestart");
    // const elabel = this.genLabel("whileend");
    let cond = this.subgen(wd.exp, env);
    if (ast.constant.is(cond)) init = this.wasmType(types.i32()).const(cond.value);
    return [
      this.module.block(blabel,[
        this.module.loop(
          slabel,
          this.module.if(
            cond,
            this.genBlock(wd.body,env,null,[],[
              this.module.br(slabel)
            ]),
            this.module.br(blabel)
          )
        ),
      ])
      // this.module.block(elabel,[])
    ];
    // return this.module.if(cond,this.module.block(null,[
    //   ,
    //   this.module.block(elabel,[])
    // ]));
  }

  equalT(t1, t2) {
    if (Array.isArray(t1) && Array.isArray(t2)) {
      if (t1.length === t2.length)
        return t1.reduce((prev, curr, i) => prev && curr && t2[i], true)
      return false;
    }
    return this.isInteger(t1) && this.isInteger(t2) ||
      this.isFloat(t1) && this.isFloat(t2)
  }

  genFuncCall(fc, env) {
    console.log("generating function call");
    console.log(fc)
    const ftype = this.global.type(fc.func.name);

    return this.module.call(
      fc.func.name,
      fc.args.map((a,i) => {
        let val = this.subgen(a, env);
        if (ast.constant.is(val)) val = this.wasmType(ftype.params[i]).const(val.value);
        return val;
      }),
      this.wasmType2(ftype.ret)
    );
  }

  genUnary(op, env) {
    // WIP
    const wt = this.wasmType(op.type[0]);
    let right = this.subgen(op.right, env);
    if (ast.constant.is(right)) right = wt.const(right.value);
    if (op.op.value === n_chmap.SUB)
      return wt.mul(wt.const(-1), right);
    if (op.op === kw_map.not)
      return this.module.select(right, wt.const(0), wt.const(1))
  }

  genBinary(op, env) {
    // put assgn in parseTerm
    const wt = this.wasmType(op.type[0]);
    // console.log("expression type")
    // console.log(wt);
    // console.log(op);
    let right = this.subgen(op.right, env);
    // console.log("right after sub")
    // console.log(right);
    if (ast.constant.is(right)) right = wt.const(right.value);
    if (op.op.value === n_chmap.ASSGN) {
      // console.log("here in binary!");
      // console.log(op);
      if (env !== this.global && env.isDefined(op.left.name)) {
        const kind = env.kind(op.left.name);
        let index = env.absIndex(op.left.name);
        if (kind === "var") index += env.total("arg");
        // console.log("index: " + index);
        // console.log("right: " + right);
        let temp = this.module.local.set(index, right);
        // console.log("after");
        return temp;
      }
      else {
        // console.log("global testing");
        // console.log(op.left.name);
        // console.log(right);
        return this.module.global.set(op.left.name, right);
      }
    }
    else {
      let left = this.subgen(op.left, env);
      if (ast.constant.is(left)) left = wt.const(left.value);
      if (op.op.value in iopmap) {
        if(wt === this.module.i32 || wt === this.module.i64)
          return wt[iopmap[op.op.value]](left, right);
        return wt[fopmap[op.op.value]](left, right);
      }
      return this.module.nop();
    }
  }

  genReturnDef(rd, env) {
    let init = this.subgen(rd.exp, env);
    if (ast.constant.is(init)) init = this.wasmType(env.ftype.ret).const(init.value);
    return this.module.return(init);
  }

  // chExportDef(ed,env) {
  //     return this.check(ed.decl,env);
  // }

  genBlock(b, env, label=null, pre=[], post=[]) {
    if(b.statements) b = b.statements;
    return this.module.block(label, pre.concat(b.flatMap(s => {
      let o = this.subgen(s, env);
      if (ast.constant.is(o)) o = this.wasmType(s.type).const(o.value);
      return o;
    })).concat(post));
  }

  subgen(node, env = this.global) {
    return node.cata({
      identifier: i => this.genIdentifier(i, env), // ["name"]
      constant: c => this.genConstant(c, env), // ["value", "type"]
      constdef: cd => this.genConstDef(cd, env), // ["iden", "type", "expr"]
      letdef: ld => this.genLetDef(ld, env), // ["iden", "type", "expr"]
      paramdef: this.module.nop, // ["name", "type"] p => this.chParamDef(p,env)
      funcdef: this.module.nop, // ["name","params","rettype","body"] f => this.chFuncDef(f,env),
      ifdef: id => this.genIfDef(id, env), // ["exp","body1","body2"]
      whiledef: wd => this.genWhileDef(wd, env), // ["exp","body"]
      block: b => this.genBlock(b, env), // ["statements"]
      binary: op => this.genBinary(op, env), // ["op","left","right"]
      unary: op => this.genUnary(op, env), // ["op","right"]
      funccall: fc => this.genFuncCall(fc, env), // ["func","args"]
      returndef: rd => this.genReturnDef(rd, env), // ["exp"]
      exportdef: this.module.nop // ["decl"] ed => this.chExportDef(ed,env)
    });
  }

  createStartUp(ginits) {
    const startup = `${String.fromCharCode(random(97, 123))}${Date.now()}`
    this.module.addFunction(
      startup,
      binaryen.createType([]),
      binaryen.none,
      [],
      this.module.block(null, ginits.map(a => {
        // if(a[2]) {
        //   this.module.addGlobal(a[0].iden, this.wasmType2(a[0].type), false, a[1]);
        //   if (a[3]) this.module.addGlobalExport(a[0].iden, a[0].iden);
        // }
        return this.module.global.set(a[0].iden, a[1])
      }
      ).concat([this.global.kind("main") === "function" ? this.module.call("main", [], binaryen.none) : this.module.nop()])));
    return this.module.getFunction(startup);
  }

  gen(nodes = this.ast, env = this.global) {
    // console.log("Passing |->")
    // console.log(ast.toString());
    // if(!ast) return "void";
    // if(Array.isArray(ast)) {
    // console.log("nodes");
    // console.log(nodes);
    const ginits = [];
    for (let dec of nodes) {
      let wexport = false;
      if (ast.exportdef.is(dec)) {
        wexport = true;
        dec = Array.isArray(dec.decl) ? dec.decl[0] : dec.decl;
      }
      // console.log("here1!");
      // console.log(dec);
      if (ast.constdef.is(dec)) {
        let init = this.subgen(dec.expr,env);
        if (ast.constant.is(init)) init = this.wasmType(dec.type).const(init.value);
        // else {
          // ginits.push([dec, init, true, wexport]);
          // init = this.wasmType(dec.type).const(0);
        // }
        this.module.addGlobal(dec.iden, this.wasmType2(dec.type), false, init)
        if (wexport) this.module.addGlobalExport(dec.iden, dec.iden)
      }
      else if (ast.letdef.is(dec)) {
        // console.log("the final straw ########");
        // console.log(dec);
        let init;
        if (dec.expr) {
          init = this.subgen(dec.expr, env);
          if (ast.constant.is(init)) init = this.wasmType(dec.type).const(init.value);
          else {
            ginits.push([dec, init]);
            init = this.wasmType(dec.type).const(0);
          }
        }
        else init = this.wasmType(dec.type).const(0);
        this.module.addGlobal(dec.iden, this.wasmType2(dec.type), true, init)
        // if(wexport) this.module.addGlobalExport(dec.iden,dec.iden)
      }
      else if (ast.funcdef.is(dec)) {
        // console.log("Generating code for function:");
        // console.log(dec.name);
        const type = env.type(dec.name);
        // console.log("function type:");
        // console.log(type.toString());
        // console.log("function body code:");
        // dec.body.forEach(s => console.log(s.toString()));
        const tab = this.fun[dec.name];
        const args = type.params;
        // tab.allkind("arg").sort((a,b) => a.absIndex < b.absIndex?-1:1);
        const locals = tab.allkind("var")
                      .concat(tab.allkind("constant"))
                      .sort((a,b) => a.absIndex < b.absIndex?-1:1);
        // const bv = ;
        this.module.addFunction(
          dec.name,
          binaryen.createType(args.map(t => this.wasmType2(t))),
          this.wasmType2(type.ret),
          locals.map(l => this.wasmType2(l.type)),
          this.genBlock(dec.body,tab)
        );
        if (wexport) this.module.addFunctionExport(dec.name, dec.name);
      }
    }
    this.module.setStart(this.createStartUp(ginits));
    this.module.autoDrop();
    this.module.optimize();
    if (!this.module.validate()) throw new Error("validation error");
    var textData = this.module.emitText();
    console.log(textData);
    return this.module.emitBinary();
  }
}

module.exports = { CodeGen };

const p = new Parser();
const t = new TypeChecker();

let a = p.parse(`
    export const x: f32 = 1.44;
    export const y: i32 = 100;
    export const z: i64 = 5030445;
    let t: i32 = (-2);

    fn main(){
      let k: i32 = 3;
    }

    export fn identity(i: i32): i32 {
      return i;
    }

    export fn test2(): f64 {
      const d: f64 = 4.0;
      const a: i32 = 1;
      const b: i64 = 2;
      const c: f32 = 3.142;
      return d/2.0;
    }

    export fn factorial(n: i32): i32 {
      if(n == 0) {
        return 1;
      }
      return n * factorial(n-1);
    }

    export fn f1(a: i32, b: i32): i32 {
      let k: f64 = 1.4;
      let i: i32 = 10;
      main();
      (-5);
      1 + 2;
      t = (9 * 2);
      // k = 3.3333;
      k = test2();
      if(a) {
        let d: i32 = t;
        let e: i32;
        return d + i * y;
      } else {
        while(i < 20) {
          i = (i + 1);
        }
        return identity(i);
      }
      return i;
    }
`);
console.log("*-AST Nodes-*");
a.forEach(n => console.log(n.toString()));
t.check(a);

const cg = new CodeGen(a, t.global, t.functabs);
let wasmData = cg.gen();

// Example usage with the WebAssembly API
var compiled = new WebAssembly.Module(wasmData);
var instance = new WebAssembly.Instance(compiled, {});
// console.log(instance.exports);
// console.log(instance.exports.x.value);
// console.log(instance.exports.y.value);
console.log(instance.exports.f1(0, 20));
console.log(instance.exports.test2());
console.log(instance.exports.factorial(5));
// console.log(instance.exports.f2());

// console.log(instance.exports.mult(1.2, 2.33));
// console.log(instance.exports.test2(10));