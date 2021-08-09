// WIP: Continously upgrading
const Tokenizer = require("./tokenizer");
const ast = require("./ast");
const { types } = require("./type");
const { toktypes, kwtypes, kw_map, n_chmap } = require("./tokens");

// const termend = [")","}","]",";",","];
const bop = ["+","-","*","/","<",">","<=",">=","!=","=","==","and","or"];
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
    "for":"parseForStatement",
    "do":"parseDoWhileStatement",
    "return": "parseReturnStatement",
    "{":"parseBlockStatement",
    "break":"parseBreak",
    "continue":"parseContinue",
    "let":"parseVarDec",
    "const":"parseVarDec",
};

// 1 = Left to right
// 0 = Right to Left
const prec = {
    "=": { bp:1, type:1 },
    "or": { bp:2, type:1 },
    "and": { bp:3, type:1 },
    "==": { bp:4, type:1 },
    "!=": { bp:4, type:1 },
    "<=": { bp:5, type:1 },
    ">=": { bp:5, type:1 },
    ">": { bp:5, type:1 },
    "<": { bp:5, type:1 },
    "+": { bp:6, type:1 },
    "-": { bp:6, type:1 },
    "*": { bp:7, type:1 },
    "/": { bp:7, type:1 },
};

class Parser {
    constructor(tok) {
        this.tok = tok;
    }

    eatWhitespace() {
        let curr = this.tok.peek(0);
        while(curr.type === toktypes.whitespace || curr.type === toktypes.newline) {
            this.tok.next();
            curr = this.tok.peek(0);
        }
    }

    expect(val, type, rmws=false, startp) {
        let context = 2;
        if(rmws) this.eatWhitespace();
        let curr = this.tok.next();
        if(startp) context = curr.row-startp.row;
        if(curr.value === val || curr.type === type) return curr;
        if(curr.type === n_chmap.EOF) this.tok.generate_error(curr, `Unexpected end, expected ${type?type:""} ${val}`,context);
        this.tok.generate_error(curr, `Expected ${type?type:""} ${val}`,context);
    }

    parse(tok) {
        if(tok) this.tok = tok;
        return this.parseTop();
        // throw new Error("No code given!");
    }

    parseType() {
        let curr = this.tok.peek(0);
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
    }

    parseVarDec(dtype,exp=false) {
        this.expect(dtype);
        let curr = this.tok.peek(0);
        const vars = [];
        while(curr.value !== n_chmap.SEMICOLON) {
            this.eatWhitespace();
            let varName = this.expect(true,toktypes.identifier,true).value;
            this.eatWhitespace();
            this.expect(n_chmap.COLON)
            this.eatWhitespace();
            const type = this.parseType();
            this.eatWhitespace();
            let curr;
            if(dtype === kw_map.const) {
                curr = this.tok.next();
                if(curr.value !== n_chmap.ASSGN) this.tok.generate_error(curr,"Initialize the constant variable")
            }
            else curr = this.tok.peek(0);
            let expr = null;
            if(curr.value === n_chmap.ASSGN) {
                this.tok.next();
                this.eatWhitespace();
                expr = this.parseExpression();
            }
            if(dtype === kw_map.const) vars.push(ast.constdef(varName,type,expr));
            if(dtype === kw_map.let) vars.push(ast.letdef(varName,type,expr));
            this.eatWhitespace();
            curr = this.tok.peek(0);
            if(curr.value === n_chmap.COMMA) {
                this.tok.next();
                continue
            }
            else break
        }
        if(!exp) this.expect(n_chmap.SEMICOLON);
        return vars.length === 1? vars[0]:vars;
    }

    parseStatements() {
        const statements = [];
        let curr = this.tok.peek(0);
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
            curr = this.tok.peek(0);
        }
        return statements;
    }

    parseBreak() {
        this.expect(kw_map.break);
        this.eatWhitespace();
        this.expect(n_chmap.SEMICOLON);
        return ast.break;
    }

    parseContinue() {
        this.expect(kw_map.continue);
        this.eatWhitespace();
        this.expect(n_chmap.SEMICOLON);
        return ast.continue;
    }

    parseReturnStatement() {
        this.expect(kw_map.return);
        let exp = null;
        this.eatWhitespace();
        if(this.tok.peek(0).value !== n_chmap.SEMICOLON) 
            exp = this.parseExpression();
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
        if(this.tok.peek(0).value == kw_map.else) {
            this.expect(kw_map.else);
            this.eatWhitespace();
            start = this.expect(n_chmap.LCURB);
            this.eatWhitespace();
            elsebody = this.parseStatements();
            this.eatWhitespace();
            this.expect(n_chmap.RCURB,false,false,start);
        }
        return ast.ifdef(exp,ifbody,elsebody);
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

    parseForStatement() {
        this.expect(kw_map.for);
        this.eatWhitespace();
        let start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const exps = [];
        let curr = this.tok.peek(0);
        for(let i = 0;i < 3;i++) {
            if(curr.value === n_chmap.SEMICOLON)
                exps.push(i==1?ast.constant(1,types.i32):null)
            if(i == 0 && curr.value === kw_map.let) 
                exps.push(this.parseVarDec(curr.value,true));
            else exps.push(this.parseExpression());
            if(i < 2) {
                this.eatWhitespace();
                this.expect(n_chmap.SEMICOLON);
            }
            this.eatWhitespace();
            curr = this.tok.peek(0);
        }
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,start);
        this.eatWhitespace();
        start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const body = this.parseStatements();
        this.eatWhitespace();
        this.expect(n_chmap.RCURB,false,false,start);
        this.eatWhitespace();
        return ast.fordef(exps,body);
    }

    parseDoWhileStatement() {
        this.expect(kw_map.do);
        this.eatWhitespace();
        let start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const body = this.parseStatements();
        this.eatWhitespace();
        this.expect(n_chmap.RCURB,false,false,start);
        this.eatWhitespace();
        this.expect(kw_map.while);
        this.eatWhitespace();
        start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const exp = this.parseExpression();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,start);
        this.eatWhitespace();
        this.expect(n_chmap.SEMICOLON);
        return ast.dowhiledef(body,exp);
    }

    parseParameterList() {
        const params = [];
            this.eatWhitespace();
            let curr = this.tok.peek(0);
            while(curr.value !== n_chmap.RPAREN && curr.type !== n_chmap.EOF) {
                this.eatWhitespace();
                const varName = this.expect(true,"identifier").value;
                this.eatWhitespace();
                this.expect(n_chmap.COLON)
                this.eatWhitespace();
                const type = this.parseType();
                params.push(ast.paramdef(varName,type))
                this.eatWhitespace();
                curr = this.tok.peek(0);
                if(curr.value === n_chmap.COMMA) {
                    this.tok.next();
                    continue;
                }
                this.eatWhitespace();
                curr = this.tok.peek(0);
            }
            return params;
    }

    parseFunctionBody() {
        const start = this.expect(n_chmap.LCURB);
        this.eatWhitespace();
        const body = this.parseStatements();
        this.eatWhitespace();
        this.curr = this.expect(n_chmap.RCURB,false,false,start);
        return body;
    }

    checkReturn(body,om=true) {
        // Return warning generator
        // Currently only checking 1 level
        // Eventually will traverse the ast (with 
        // if/else/loop/block exhuastive checking) searching for return statement 
        let i = 0;
        let out = [...body];
        while(out.length != 0) {
            let curr = out[i];
            if(Array.isArray(curr)); // recursive call check ret with om flag false
            if(ast.returndef.is(curr) && om) return;
            if(ast.block.is(curr)) out = out.concat(block.statements);
            i++;
        }
        try {
            this.tok.generate_error(this.curr,"Non-void function not returning"); 
        } catch(e) {
            console.log("WARNING:" + e.message);
        }  
    }

    parseFunctionDec() {
        let curr;
        this.expect(kw_map.fn);
        this.eatWhitespace();
        const name = this.expect(true,"identifier").value;
        this.eatWhitespace();
        this.expect(n_chmap.LPAREN);
        const params = this.parseParameterList();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN);
        let rettype = types.void;
        this.eatWhitespace();
        curr = this.tok.peek(0);
        if(curr.value === n_chmap.COLON) {
            this.tok.next();
            this.eatWhitespace();
            rettype = this.parseType();
        }
        this.eatWhitespace();
        const body = this.parseFunctionBody();
        if(rettype !== types.void) this.checkReturn(body);
        return ast.funcdef(name,params,rettype,body)
    }

    parseExport() {
        this.expect(kw_map.export);
        this.eatWhitespace();
        const out = this.parseDecl();
        // Add error for exporting let var decs
        return ast.exportdef(out);
    }

    parseDecl() {
        let curr = this.tok.peek(0);
        if(curr.value === kw_map.const || curr.value === kw_map.let)
            return this.parseVarDec(curr.value);
        if(curr.value === kw_map.fn) return this.parseFunctionDec();
        if(curr.value === kw_map.export) return this.parseExport();
        // WIP
        // if(curr.value === kw_map.import) return this.parseImport();
    }

    parseTop() {
        this.eatWhitespace();
        let curr = this.tok.peek(0);
        let module = [];
        while(curr.type !== n_chmap.EOF) {
            let gd = this.parseDecl();
            if(gd) module = module.concat(gd);
            else this.tok.generate_error(curr,"Expected a top level declaration");
            this.eatWhitespace();
            curr = this.tok.peek(0);
        }
        return module;
    }

    parseExpressionList() {
        const args = [];
        let next = this.tok.peek(0);
        if(next.value !== n_chmap.RPAREN) {
            args.push(this.parseExpression());
            this.eatWhitespace();
            next = this.tok.peek(0);
            while(next.value !== n_chmap.RPAREN) {
                this.expect(n_chmap.COMMA);
                this.eatWhitespace();
                args.push(this.parseExpression());
                this.eatWhitespace();
                next = this.tok.peek(0);
                this.eatWhitespace();
            } 
        }  
        return args; 
    }

    parseFunctionCall() {
        let name = ast.identifier(this.expect(true,toktypes.identifier).value);
        this.eatWhitespace();
        let start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const nargs = this.parseExpressionList();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,false,start);
        return ast.funccall(name,nargs)
    }

    parseCast() {
        const type = this.parseType();
        this.eatWhitespace();
        const start = this.expect(n_chmap.LPAREN);
        this.eatWhitespace();
        const expr = this.parseExpression();
        this.eatWhitespace();
        this.expect(n_chmap.RPAREN,false,false,start);
        return ast.unary(type,expr,[]);
    }

    parseTerm() {
        this.eatWhitespace();
        let curr = this.tok.peek(0);
        if(curr.value === n_chmap.LPAREN) {
            let start = this.expect(n_chmap.LPAREN);
            let e = this.parseExpression();
            this.expect(n_chmap.RPAREN,false,false,start);
            return e;
        }
        if(uop.includes(curr.value)) {
            const op = this.expect(curr.value);
            const e = this.parseTerm();
            if(ast.constant.is(e) && op.value === n_chmap.SUB) return ast.constant(-e.value,e.type);
            return ast.unary(op,e,[]);
        }
        if(curr.type === toktypes.integer)
            return ast.constant(this.tok.next().value,types.intConstant);
        if(curr.type === toktypes.float) 
            return ast.constant(this.tok.next().value,types.floatConstant);
        if(kwc.includes(curr.value)) 
            return ast.constant(kwc_map[this.tok.next().value],types.intConstant);
        if(curr.type === toktypes.identifier) {
            let temp = this.tok.peek(1,true);
            if(temp.value === n_chmap.LPAREN) {
                this.eatWhitespace();
                return this.parseFunctionCall()
            }
            return ast.identifier(this.tok.next().value);
        }
        if(curr.type === toktypes.keyword) {
            if(kwtypes.includes(curr.value)) return this.parseCast();
            throw this.tok.generate_error(curr,"Reserved keyword");
        }
        throw this.tok.generate_error(curr,"Unknown expression term");
    }

    handleInfix(op,left) {
        this.eatWhitespace();
        left = ast.binary(op,left,this.parseExpression(prec[op.value].bp),[]);
        this.eatWhitespace();
        return left;
    }

    handleInfixr(op,left) {
        this.eatWhitespace();
        left = ast.binary(op,left,this.parseExpression(prec[op.value].bp-1),[]);
        this.eatWhitespace();
        return left;
    }

    parseExpression(rbp=0) {
        let l = this.parseTerm();
        this.eatWhitespace();
        let curr = this.tok.peek(0);
        while(bop.includes(curr.value) && rbp < prec[curr.value].bp) {
            const op = this.expect(curr.value);
            l = prec[curr.value].type?
                this.handleInfix(op,l) :
                this.handleInfixr(op,l);
            curr = this.tok.peek(0);
        }
        return l;
    }
}

module.exports = Parser;