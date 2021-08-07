// WIP
const Tokenizer = require("./tokenizer");
const ast = require("./ast");
const { types } = require("./type");
const { toktypes, kw_map, n_chmap } = require("./tokens");

// Placeholder code
// The new compiler will use a similar structure
// Will be sandwiching operator precedence parser in between
const termend = [")","}","]",";",","];
const bop = ["+","-","*","/","<",">","<=",">=","=","==","and","or"];
// "~","&","|",
const uop = ["-","not"];
const kwc = ["true","false",
// "null"
];

const kwc_map = {
    "true": 1,
    "false": 0,
    // "null": 0
};

const stp = {
    // "let": "compileLetStatement",
    "if": "parseIfStatement",
    "while": "parseWhileStatement",
    // "do": "parseDoStatement",
    "return": "parseReturnStatement",
    "{":"parseBlockStatement",
    "let":"parseVarDec",
    "const":"parseVarDec",
};

const prec = {
    
};

class Parser {
    constructor(code) {
        if(code) this.setup(code);
    }

    setup(code) {
        this.code = code;
        this.tok = new Tokenizer(code);
        // this.vm = new VMEmitter();
        // this.gst = new SymbolTable(null);
        // this.mst = new SymbolTable(this.cst);
        // this.className = null;
        // this.subName = null;
        // this.subType = null;
        // this.count = {
        //     "if":0,
        //     "else":0,
        //     "while":0,
        // };
    }

    eatWhitespace() {
        let curr = this.tok.peek();
        // console.log("before eating white space!");
        // console.log(this.tok.tbuff);
        while(curr.type === toktypes.whitespace || curr.type === toktypes.newline) {
            // console.log("removing");
            this.tok.next();
            curr = this.tok.peek();
            // console.log("lets peek pecker");
            // console.log(curr);
        }
        // console.log("after eating white space!");
        // console.log(this.tok.tbuff);
    }

    expect(val, type, rmws=false, startp) {
        let context = 2;
        if(rmws) this.eatWhitespace();
        let curr = this.tok.next();
        if(startp) context = curr.row-startp.row;
        if(curr.value === val || curr.type === type) return curr;
        if(curr.type === n_chmap.EOF) this.tok.generate_error(curr, `Unexpected end, expected ${type?type:""} ${val}`,context);
        this.tok.generate_error(curr, `Expected ${type?type:""} ${val}`,context);
        // throw new SyntaxError(`Expected ${type?type:""} ${val}`);
    }

    parse(code) {
        if(this.code || code) {
            if(code) this.setup(code);
            return this.parseModule();
        }
        throw new Error("No code given!");
    }

    parseType() {
        let curr = this.tok.peek();
        // console.log("inside type");
        // console.log(curr);
        if(curr.value === kw_map.i32)
            return this.expect(kw_map.i32) && types.i32;     
        if(curr.value === kw_map.i64)
            return this.expect(kw_map.i64) && types.i64;
        if(curr.value === kw_map.f32)
            return this.expect(kw_map.f32) && types.f32;     
        if(curr.value === kw_map.f64)
            return this.expect(kw_map.f64) && types.f64;
        // else if(curr.value == "char") 
        //     return this.expect("char").value;
        if(curr.value == "bool") 
            return this.expect(kw_map.bool) && types.i32;
        this.tok.generate_error(curr,"Expected a type");
        // return this.expect(true,"identifier").value;
    }

    parseVarDec(dtype) {
        this.expect(dtype);
        let curr = this.tok.peek();
        const vars = [];
        while(curr.value !== n_chmap.SEMICOLON) {
            this.eatWhitespace();
            let varName = this.expect(true,toktypes.identifier,true).value;
            this.eatWhitespace();
            this.expect(n_chmap.COLON)
            this.eatWhitespace();
            const type = this.parseType();
            // this.gst.define(varName,type,dtype);
            this.eatWhitespace();
            let curr;
            if(dtype === kw_map.const) {
                curr = this.tok.next();
                if(curr.value !== n_chmap.ASSGN) this.tok.generate_error(curr,"Initialize the constant variable")
            }
            else curr = this.tok.peek();
            let expr = null;
            if(curr.value === n_chmap.ASSGN) {
                this.tok.next();
                this.eatWhitespace();
                expr = this.parseExpression();
                console.log("here!----!");
                console.log(expr)
            }
            if(dtype === kw_map.const) vars.push(ast.constdef(varName,type,expr));
            if(dtype === kw_map.let) vars.push(ast.letdef(varName,type,expr));
            this.eatWhitespace();
            curr = this.tok.peek();
            if(curr.value === n_chmap.COMMA) {
                this.tok.next();
                continue
            }
            else break
        }
        this.expect(n_chmap.SEMICOLON);
        return vars.length === 1? vars[0]:vars;
    }

    parseStatements() {
        const statements = [];
        let curr = this.tok.peek();
        // console.log("statement curr tok");
        // console.log(curr);
        // || (!termend.includes(curr.value))
        while(curr.value in stp || 
            (
                curr.type === toktypes.identifier || 
                curr.value === n_chmap.LPAREN ||
                uop.includes(curr.value) || 
                curr.type === toktypes.integer ||
                curr.type === toktypes.float ||
                curr.value in kwc_map
            )
        ) {
            this.eatWhitespace();
            const m = stp[curr.value];
            if(m) statements.push(this[m](curr.value));
            else {
                this.eatWhitespace();
                statements.push(this.parseExpression());
                this.eatWhitespace();
                this.expect(n_chmap.SEMICOLON);
            }
            this.eatWhitespace();
            curr = this.tok.peek();
            // console.log("curr toki: ");
            // console.log(curr);
            // console.log("statements after every iteration");
            // console.log(statements);
        }
        return statements;
    }

    parseReturnStatement() {
        this.expect(kw_map.return);
        let exp = null;
        this.eatWhitespace();
        if(this.tok.peek().value !== n_chmap.SEMICOLON) 
            exp = this.parseExpression();
        // else this.vm.emitPush("constant",0);
        this.eatWhitespace();
        this.expect(n_chmap.SEMICOLON);
        return ast.returndef(exp);
    }

    parseBlockStatement() {
        let start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const statements = this.parseStatements();
        this.eatWhitespace();
        this.expect(n_chmap.RCURB,false,false,start);
        return ast.block(statements);
    }

    parseIfStatement() {
        this.expect(kw_map.if);
        this.eatWhitespace();
        let start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const exp = this.parseExpression();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,start);
        this.eatWhitespace();
        start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const ifbody = this.parseStatements();
        let elsebody = null;
        this.eatWhitespace();
        this.expect(n_chmap.RCURB,false,false,start);
        this.eatWhitespace();
        if(this.tok.peek().value == kw_map.else) {
            this.expect(kw_map.else);
            this.eatWhitespace()
            start = this.expect(n_chmap.LCURB);
            this.eatWhitespace();
            elsebody = this.parseStatements();
            this.eatWhitespace();
            this.expect(n_chmap.RCURB,false,false,start);
        }
        return ast.ifdef(exp,ifbody,elsebody);
        // this.vm.emitLabel(L2);
    }

    parseWhileStatement() {
        this.expect(kw_map.while);
        this.eatWhitespace();
        let start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const exp = this.parseExpression();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,start);
        this.eatWhitespace();
        start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const body = this.parseStatements();
        this.eatWhitespace();
        this.expect(n_chmap.RCURB,false,false,start);
        this.eatWhitespace();
        return ast.whiledef(exp,body);
    }

    parseParameterList() {
        const params = [];
        // this.eatWhitespace();
        // if(this.tok.peek().value !== n_chmap.RPAREN) {
            // if(this.subType == "method") {
                // this.mst.define("this",this.className,"argument");
            // }
            // this.mst.define(varName,type,"argument");
            this.eatWhitespace();
            let curr = this.tok.peek();
            while(curr.value !== n_chmap.RPAREN && curr.type !== n_chmap.EOF) {
                this.eatWhitespace();
                const varName = this.expect(true,"identifier").value;
                this.eatWhitespace();
                this.expect(n_chmap.COLON)
                this.eatWhitespace();
                const type = this.parseType();
                params.push(ast.paramdef(varName,type))
                this.eatWhitespace();
                curr = this.tok.peek();
                if(curr.value === n_chmap.COMMA) {
                    this.tok.next();
                    continue;
                }
                // else break;
                // type = this.compileType();
                // varName = this.expect(true,"identifier").value;
                // this.mst.define(varName,type,"argument");
                this.eatWhitespace();
                curr = this.tok.peek();
            }
            // console.log("here in func params!");
            // console.log(params)
            return params;
        // }
        // return params;
    }

    parseFunctionBody() {
        const start = this.expect(n_chmap.LCURB);
        let curr = this.tok.peek();
        // while(curr.value == "var") {
        //     this.compileVarDec();
        //     curr = this.tok.peek();
        // }
        // this.vm.emitFunction(this.genSubname(),this.mst.total("local"));
        // if(this.subType == "method") {
        //     this.vm.emitPush("argument",0);
        //     this.vm.emitPop("pointer",0);
        // }
        // else if(this.subType == "constructor") {
        //     this.vm.emitPush("constant",this.gst.total("field"));
        //     this.vm.emitCall("Memory.alloc",1);
        //     this.vm.emitPop("pointer",0);
        // }
        this.eatWhitespace();
        const body = this.parseStatements();
        this.eatWhitespace();
        // console.log("bstart")
        // console.log(start);
        this.expect(n_chmap.RCURB,false,false,start);
        return body;
    }

    parseFunctionDec() {
        let curr;
        this.expect(kw_map.fn);
        // this.subType = this.tok.next().value;
        this.eatWhitespace();
        const name = this.expect(true,"identifier").value;
        // let curr = this.tok.peek();
        // let type;
        // if(curr.value == "void") type = this.tok.next().value;
        // else type = this.compileType();
        // this.subName = 
        this.eatWhitespace();
        this.expect(n_chmap.LPAREN);
        const params = this.parseParameterList();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN);
        let rettype = types.void;
        this.eatWhitespace();
        curr = this.tok.peek();
        if(curr.value === n_chmap.COLON) {
            this.tok.next();
            this.eatWhitespace();
            rettype = this.parseType();
        }
        this.eatWhitespace();
        const body = this.parseFunctionBody();
        // this.compileSubroutineBody();
        // this.mst.reset();
        return ast.funcdef(name,params,rettype,body)
    }

    parseExport() {
        // WIP: Do it after expressions, type checking and codegen
        this.expect(kw_map.export);
        this.eatWhitespace();
        const out = this.parseDecl();
        // Add error for exporting let var decs
        return ast.exportdef(out);
    }

    parseDecl() {
        let curr = this.tok.peek();
        if(curr.value === kw_map.const || curr.value === kw_map.let)
            return this.parseVarDec(curr.value);
        if(curr.value === kw_map.fn) return this.parseFunctionDec();
        if(curr.value === kw_map.export) return this.parseExport();
        // WIP
        // if(curr.value === kw_map.import) return this.parseImport();
    }

    parseModule() {
        this.eatWhitespace();
        let curr = this.tok.peek();
        let module = [];
        while(curr.type !== n_chmap.EOF) {
            let gd = this.parseDecl();
            if(gd) module = module.concat(gd);
            else this.tok.generate_error(curr,"Expected a top level declaration");
            this.eatWhitespace();
            curr = this.tok.peek();
        }
        return module;
    }

    parseExpressionList() {
        // let n = 0;
        // if(this.subType == "method") n++;
        const args = [];
        let next = this.tok.peek();
        if(next.value !== n_chmap.RPAREN) {
            args.push(this.parseExpression());
            this.eatWhitespace();
            next = this.tok.peek();
            // n++;
            while(next.value !== n_chmap.RPAREN) {
                this.expect(n_chmap.COMMA);
                this.eatWhitespace();
                args.push(this.parseExpression());
                // n++;
                this.eatWhitespace();
                next = this.tok.peek();
                this.eatWhitespace();
            } 
        }  
        // console.log("**********-**********");
        // console.log("args in expr list");
        // console.log(args);
        return args; 
    }

    parseFunctionCall() {
        let name = ast.identifier(this.expect(true,toktypes.identifier).value);
        this.eatWhitespace();
        // const next = this.tok.peek();
        // if(next.value == ".") {
        //     this.expect(".");
        //     if(this.mst.isDefined(name)) this.readVar(name);
        //     name += "."+this.expect(true,"identifier").value;
        // }
        this.eatWhitespace();
        let start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const nargs = this.parseExpressionList();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,false,start);
        return ast.funccall(name,nargs)
    }

    parseTerm() {
        this.eatWhitespace();
        let curr = this.tok.peek();
        // console.log("here i am!");
        // console.log(curr)
        if(curr.value === n_chmap.LPAREN) {
            let start = this.expect(n_chmap.LPAREN);
            let e = this.parseExpression();
            this.expect(n_chmap.RPAREN,false,false,start);
            return e;
        }
        if(uop.includes(curr.value)) {
            const op = this.expect(curr.value);
            const e = this.parseTerm();
            return ast.unary(op,e,[]);
        }
        if(curr.type === toktypes.integer)
            return ast.constant(this.tok.next().value,toktypes.integer);
        if(curr.type === toktypes.float) 
            return ast.constant(this.tok.next().value,toktypes.float);

        if(kwc.includes(curr.value)) {
            // this.expect(true,"keyword");
            const value = this.tok.next();
            return ast.constant(kwc_map[curr.value],toktypes.integer);
            // if(curr.value in kwc_map) {
            //     this.vm.emitPush("constant", kwc_map[curr.value]);
            // }
        }
        if(curr.type === toktypes.identifier) {
            // console.log("atleast reached here!");
            // this.eatWhitespace();
            let temp = this.tok.peek(2);
            // || temp.value == "."
            // console.log("temppp")
            // console.log(temp)
            // console.log("the tbuffer");
            // console.log(this.tok.tbuff);
            if(temp.value === n_chmap.LPAREN) {
                // console.log("handling funk call");
                this.eatWhitespace();
                return this.parseFunctionCall()
            }
            // else if(temp.value == "[") {
            //     const varName = this.expect(true,"identifier").value;
            //     this.readVar(varName);
            //     this.expect("[");
            //     this.compileExpression();
            //     this.expect("]");
            // }
            else return ast.identifier(this.tok.next().value);
        }
        throw this.tok.generate_error(curr,"Unknown expression term");
    }


    parseExpression() {
        // Sandwich a precedence parser here.
        let l = this.parseTerm();
        this.eatWhitespace();
        let curr = this.tok.peek();
        while(bop.includes(curr.value)) {
            // console.log("inside the loop");
            const op = this.expect(curr.value);
            this.eatWhitespace();
            // console.log("peeking here");
            // console.log(this.tok.peek());
            if(!termend.includes(this.tok.peek().value)) {
                this.eatWhitespace();
                l = ast.binary(op,l,this.parseTerm(),[]);
            }
            this.eatWhitespace();
            curr = this.tok.peek();
        }
        // console.log("after expression!");
        // console.log(l)
        return l;
    }
}

module.exports = Parser;