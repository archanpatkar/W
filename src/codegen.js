const ast = require("./ast");
const { types } = require("./type");
const { n_chmap, kw_map } = require("./tokens");
const binaryen = require("binaryen");

function random(min, max) {
  const r = Math.random() * (max - min) + min
  return Math.floor(r)
}

types.i32.__proto__.cast = function(type,mod) {
  return type.cata({
    i32: () => i => i,
    i64: () => mod.i32.wrap,
    f32: () => mod.i32.trunc_s.f32,
    f64: () => mod.i32.trunc_s.f64,
    intConstant: () => mod.i32.const,
    floatConstant: () => mod.i32.const,
    bool: () => {},
    char: () => {},
    void: () => {},
    func: () => {}
  });
}

types.i64.__proto__.cast = function(type,mod) {
  return type.cata({
    i32: () => mod.i64.extend_s,
    i64: () => i => i,
    f32: () => mod.i64.trunc_s.f32,
    f64: () => mod.i64.trunc_s.f64,
    intConstant: () => mod.i64.const,
    floatConstant: () => mod.i64.const,
    bool: () => {},
    char: () => {},
    void: () => {},
    func: () => {}
  });
}

types.f32.__proto__.cast = function(type,mod) {
  return type.cata({
    i32: () => mod.f32.convert_s.i32,
    i64: () => mod.f32.convert_s.i64,
    f32: () => i => i,
    f64: () => mod.f32.demote,
    intConstant: () => mod.f32.const,
    floatConstant: () => mod.f32.const,
    bool: () => {},
    char: () => {},
    void: () => {},
    func: () => {}
  });
}

types.f64.__proto__.cast = function(type,mod) {
  return type.cata({
    i32: () => mod.f64.convert_s.i32,
    i64: () => mod.f64.convert_s.i64,
    f32: () => mod.f64.promote,
    f64: () => i => i,
    intConstant: () => mod.f64.const,
    floatConstant: () => mod.f64.const,
    bool: () => {},
    char: () => {},
    void: () => {},
    func: () => {}
  });
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
  constructor(ast, st) {
    this.init(ast, st.gst, st.fst);
  }

  ltop() {
    return this.lstack[0];
  }

  lpush(b,c) {
    this.lstack.unshift([b,c]);
  }

  lpop() {
    this.lstack.shift();
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
    this.lstack = [];
    this.labels = {
      while:0
    };
  }

  wasmType(type) {
    return type.cata({
      i32: () => this.module.i32,
      i64: () => this.module.i64,
      f32: () => this.module.f32,
      f64: () => this.module.f64,
      bool: () => this.module.i32,
      intConstant: () => this.module.i32,
      floatConstant: () => this.module.f32,
      char: () => {},
      void: () => {},
      func: () => {}
    });
  }

  wasmType2(type) {
    return type.cata({
      i32: () => binaryen.i32,
      i64: () => binaryen.i64,
      f32: () => binaryen.f32,
      f64: () => binaryen.f64,
      bool: () => binaryen.i32,
      intConstant: () => binaryen.i32,
      floatConstant: () => binaryen.f32,
      char: () => {},
      void: () => binaryen.none,
      func: () => {}
    });
  }

  genConstant(n) {
    if (
      types.is(n.type) && 
      !types.intConstant.is(n.type) && 
      !types.floatConstant.is(n.type)
    ) {
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

  genIfDef(id, env) {
    let cond = this.subgen(id.exp, env);
    if (ast.constant.is(cond)) cond = this.wasmType(types.i32).const(cond.value);
    let body1 = this.genBlock(id.body1,env);
    let body2 = id.body2 ? this.genBlock(id.body2,env) : undefined;
    return this.module.if(cond, body1, body2);
  }

  genWhileDef(wd, env) {
    const blabel = this.genLabel("wblockstart");
    const slabel = this.genLabel("whilestart");
    this.lpush(blabel,slabel);
    let cond = this.subgen(wd.exp, env);
    if (ast.constant.is(cond)) cond = this.wasmType(types.i32).const(cond.value);
    const block = this.genBlock(wd.body,env,null,[],[
      this.module.br(slabel)
    ]);
    this.lpop();
    return [
      this.module.block(blabel,[
        this.module.loop(
          slabel,
          this.module.if(
            cond,
            block,
            this.module.br(blabel)
          )
        ),
      ])
    ];
  }

  genForDef(wd, env) {
    const blabel = this.genLabel("fblockstart");
    const slabel = this.genLabel("forstart");
    const elabel = this.genLabel("forbody");
    this.lpush(blabel,elabel);
    let exps = wd.exps.map(e => e?this.subgen(e, env):this.module.nop());
    let cond = exps[1];
    if (ast.constant.is(cond)) cond = this.wasmType(types.i32).const(cond.value);
    const block = this.genBlock(wd.body,env,elabel);
    this.lpop();
    return [
      this.module.block(blabel,[
        exps[0],
        this.module.loop(
          slabel,
          this.module.if(
            cond,
            this.module.block(null,[
              block,
              exps[2],
              this.module.br(slabel)
            ]),
            this.module.br(blabel)
          )
        ),
      ])
    ];
  }

  genDoWhileDef(wd, env) {
    const blabel = this.genLabel("doblockstart");
    const slabel = this.genLabel("dostart");
    this.lpush(blabel,slabel);
    let cond = this.subgen(wd.exp, env);
    if (ast.constant.is(cond)) cond = this.wasmType(types.i32).const(cond.value);
    const block = this.genBlock(wd.body,env);
    this.lpop();
    return [
      this.module.block(blabel,[
        this.module.loop(
          slabel,
          this.module.block(null,[
            block,
            this.module.if(
              cond,
              this.module.br(slabel),
              this.module.br(blabel)
            )
          ])
        )
      ])
    ];
  }

  genBreak(env) {
    let b = this.ltop()[0];
    // console.log(b);
    // b = b[0];
    if(b) return this.module.br(b);
    return this.module.nop();
  }

  genContinue(env) {
    let c = this.ltop()[1];
    if(c) return this.module.br(c);
    return this.module.nop();
  }

  genFuncCall(fc, env) {
    // console.log("generating function call");
    // console.log(fc)
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
    let right = this.subgen(op.right, env);
    if(types.is(op.op)) {
      // type casting code
      return ast.constant.is(right)?
        op.op.cast(op.type[0],this.module)(right.value): 
        op.op.cast(op.type[0],this.module)(right);
    }
    const wt = this.wasmType(op.type[0]);
    if (ast.constant.is(right)) right = wt.const(right.value);
    if (op.op.value === n_chmap.SUB)
      return wt.mul(wt.const(-1), right);
    if (op.op.value === kw_map.not)
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
      if(op.op.value === kw_map.and) {
        return this.module.select(
          left, 
          this.module.select(
            right, 
            wt.const(1), 
            wt.const(0)
          ), 
          wt.const(0)
        );
      }
      if(op.op.value === kw_map.or) {
        return this.module.select(
          left,  
          wt.const(1),
          this.module.select(
            right, 
            wt.const(1), 
            wt.const(0)
          )
        );
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
      dowhiledef: dw => this.genDoWhileDef(dw, env), // ["exp","body"]
      fordef: dw => this.genForDef(dw, env), // ["exps","body"]
      block: b => this.genBlock(b, env), // ["statements"]
      binary: op => this.genBinary(op, env), // ["op","left","right"]
      unary: op => this.genUnary(op, env), // ["op","right"]
      funccall: fc => this.genFuncCall(fc, env), // ["func","args"]
      returndef: rd => this.genReturnDef(rd, env), // ["exp"]
      exportdef: this.module.nop, // ["decl"] ed => this.chExportDef(ed,env)
      break: () => this.genBreak(env),
      continue: () => this.genContinue(env)
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
      ).concat([this.global.isDefined("main") && this.global.kind("main") === "function" ? this.module.call("main", [], binaryen.none) : this.module.nop()])));
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
        const type = env.type(dec.name);
        const tab = this.fun[dec.name];
        const args = type.params;
        const locals = tab.allkind("var")
                      .concat(tab.allkind("constant"))
                      .sort((a,b) => a.absIndex < b.absIndex?-1:1);
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