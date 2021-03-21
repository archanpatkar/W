const Tokenizer = require("./tokenizer");
const SymbolTable = require("./symtab");
// WIP
const Type = require("./type");
const Optimizer = require("./optimizer");
const CodeGen = require("./codegen");
const { kw_map } = require("./tokens");
// *********

// const VMEmitter = require("./vmcode");

// Placeholder code
// The new compiler will use a similar structure
// Will be sandwiching operator precedence parser in between

const termend = [")","}","]",";",","];
const bop = ["+","-","*","/","&","|","<",">","="];
const uop = ["-","~"];
const kwc = ["true","false","null","this"];

const kwc_map = {
    "true": 1,
    "false": 0,
    "null": 0
};

const stp = {
    "let": "compileLetStatement",
    "if": "compileIfStatement",
    "while": "compileWhileStatement",
    "do": "compileDoStatement",
    "return": "compileReturnStatement"    
};

const prec = {
    
};

class Compiler {
    constructor(code) {
        if(code) this.setup(code);
    }

    setup(code) {
        this.code = code;
        this.tok = new Tokenizer(code);
        this.vm = new VMEmitter();
        this.cst = new SymbolTable(null);
        this.mst = new SymbolTable(this.cst);
        this.className = null;
        this.subName = null;
        this.subType = null;
        this.count = {
            "if":0,
            "else":0,
            "while":0,
        };
    }

    expect(val, type) {
        const curr = this.tok.next();
        if(curr.value == val || curr.type == type) return curr;
        throw new SyntaxError(`Expected ${type?type:""} ${val}`);
    }

    compile(code) {
        if(this.code || code) {
            if(code) this.setup(code);
            this.compileClass();
            return this.vm.compgen();
        }
        throw new Error("No code given!");
    }

    compileClass() {
        this.expect("class");
        this.className = this.expect(true,"identifier").value;
        this.expect("{");
        let curr = this.tok.peek().value;
        while(curr == "static" || curr == "field") {
            this.compileClassVarDec();
            curr = this.tok.peek().value;
        }
        curr = this.tok.peek().value;
        while(curr == "constructor" || 
              curr == "function" || 
              curr == "method") {
            this.compileSubroutineDec();    
            curr = this.tok.peek().value;
        }
        this.expect("}");
    }

    compileType() {
        let curr = this.tok.peek();
        if(curr.value == "int") 
            return this.expect("int").value;
        else if(curr.value == "char") 
            return this.expect("char").value;
        else if(curr.value == "boolean") 
            return this.expect("boolean").value;
        return this.expect(true,"identifier").value;
    }

    compileClassVarDec() {
        const kind = this.tok.next().value;
        const type = this.compileType();
        let varName = this.expect(true,"identifier").value;
        this.cst.define(varName,type,kind);
        let curr = this.tok.peek();
        while(curr.value != ";") {
            this.expect(",");
            varName = this.expect(true,"identifier").value;
            this.cst.define(varName,type,kind);
            curr = this.tok.peek();
        }
        this.expect(";");
    }

    compileParameterList() {
        if(this.tok.peek().value !== ")") {
            let type = this.compileType();
            if(this.subType == "method") {
                this.mst.define("this",this.className,"argument");
            }
            let varName = this.expect(true,"identifier").value;
            this.mst.define(varName,type,"argument");
            let curr = this.tok.peek();
            while(curr.value != ")") {
                this.expect(",");
                type = this.compileType();
                varName = this.expect(true,"identifier").value;
                this.mst.define(varName,type,"argument");
                curr = this.tok.peek();
            }
        }
    }

    readVar(name) {
        const type = this.mst.kind(name);
        if(type == "field")
            this.vm.emitPush("this",this.mst.index(name));
        else this.vm.emitPush(type,this.mst.index(name));
    }

    writeVar(name) {
        const type = this.mst.kind(name);
        if(type == "field")
            this.vm.emitPop("this",this.mst.index(name));
        else this.vm.emitPop(type,this.mst.index(name));
    }

    compileLetStatement() {
        this.expect("let");
        let varName = this.expect(true,"identifier").value;
        let curr = this.tok.peek();
        if(curr.value == "[") {
            this.readVar(varName);
            this.expect("[");
            this.compileExpression();
            this.expect("]");
            this.vm.emitBinaryOp("+");
        }
        this.expect("=");
        this.compileExpression();
        this.expect(";");
        if(curr.value == "[") {
            this.vm.emitPop("temp",0);
            this.vm.emitPop("pointer",1);
            this.vm.emitPush("that",0);
            this.vm.emitPush("temp",0);
            this.vm.emitPop("that",0);
        }
        else this.writeVar(varName);
    }

    genLabel(type) {
        return `${this.className}$${this.subName}.${type}${this.count[type]++}`;
    }

    compileIfStatement() {
        const L1 = this.genLabel("if");
        const L2 = this.genLabel("else");
        this.expect("if");
        this.expect("(");
        this.compileExpression();
        this.vm.emitUnaryOp("~");
        this.vm.emitIf(L1);
        this.expect(")");
        this.expect("{");
        this.compileStatements();
        this.expect("}");
        this.vm.emitGoto(L2);
        this.vm.emitLabel(L1);
        if(this.tok.peek().value == "else") {
            this.expect("else");
            this.expect("{");
            this.compileStatements();
            this.expect("}");
        }
        this.vm.emitLabel(L2);
    }

    compileWhileStatement() {
        const L1 = this.genLabel("while");
        const L2 = this.genLabel("while");
        this.vm.emitLabel(L1);
        this.expect("while");
        this.expect("(");
        this.compileExpression();        
        this.expect(")");
        this.vm.emitUnaryOp("~");
        this.vm.emitIf(L2);
        this.expect("{");
        this.compileStatements();
        this.expect("}");
        this.vm.emitGoto(L1);
        this.vm.emitLabel(L2);
    }

    compileDoStatement() {
        this.expect("do");
        this.compileSubroutineCall();
        this.expect(";");
        this.vm.emitPop("temp",0);
    }

    compileReturnStatement() {
        this.expect("return");
        if(this.tok.peek().value !== ";") this.compileExpression();
        else this.vm.emitPush("constant",0);
        this.expect(";");
        this.vm.emitReturn();
    }

    compileStatements() {
        let curr = this.tok.peek();
        while(curr.value in stp) {
            this[stp[curr.value]]();
            curr = this.tok.peek();
        }
    }

    compileVarDec() {
        this.expect("var");
        const type = this.compileType();
        let varName = this.expect(true,"identifier").value;
        this.mst.define(varName,type,"local");
        let curr = this.tok.peek();
        while(curr.value != ";") {
            this.expect(",");
            varName = this.expect(true,"identifier").value;
            this.mst.define(varName,type,"local");
            curr = this.tok.peek();
        }
        this.expect(";");
    }

    compileSubroutineBody() {
        this.expect("{");
        let curr = this.tok.peek();
        while(curr.value == "var") {
            this.compileVarDec();
            curr = this.tok.peek();
        }
        this.vm.emitFunction(this.genSubname(),this.mst.total("local"));
        if(this.subType == "method") {
            this.vm.emitPush("argument",0);
            this.vm.emitPop("pointer",0);
        }
        else if(this.subType == "constructor") {
            this.vm.emitPush("constant",this.cst.total("field"));
            this.vm.emitCall("Memory.alloc",1);
            this.vm.emitPop("pointer",0);
        }
        this.compileStatements();
        this.expect("}");
    }

    genSubname() {
        return `${this.className}.${this.subName}`;
    }

    compileSubroutineDec() {
        this.subType = this.tok.next().value;
        let curr = this.tok.peek();
        let type;
        if(curr.value == "void") type = this.tok.next().value;
        else type = this.compileType();
        this.subName = this.expect(true,"identifier").value;
        this.expect("(");
        this.compileParameterList();
        this.expect(")");
        this.compileSubroutineBody();
        this.mst.reset();
    }

    compileExpressionList() {
        let n = 0;
        if(this.subType == "method") n++;
        let next = this.tok.peek();
        if(next.value !== ")") {
            this.compileExpression();
            next = this.tok.peek();
            n++;
            while(next.value !== ")") {
                this.expect(",");
                this.compileExpression();
                n++;
                next = this.tok.peek();
            } 
        }  
        return n; 
    }

    compileSubroutineCall() {
        let name = this.expect(true,"identifier").value;
        const next = this.tok.peek();
        if(next.value == ".") {
            this.expect(".");
            if(this.mst.isDefined(name)) this.readVar(name);
            name += "."+this.expect(true,"identifier").value;
        }
        this.expect("(");
        const nargs = this.compileExpressionList();
        this.expect(")");
        this.vm.emitCall(name,nargs);
    }

    compileTerm() {
        let curr = this.tok.peek();
        if(curr.value == "(") {
            this.expect("(");
            this.compileExpression();
            this.expect(")");
        }
        else if(uop.includes(curr.value)) {
            this.expect(curr.value);
            this.compileTerm();
            this.vm.emitUnaryOp(curr.value);
        }
        else if(curr.type == "integerConstant") {
            this.expect(true,"integerConstant");
            this.vm.emitPush("constant",curr.value);
        }
        else if(curr.type == "stringConstant") {
            this.expect(true,"stringConstant");
            const len = curr.value.length;
            this.vm.emitPush("constant",len);
            this.vm.emitCall("String.new",1);
            for(let i = 0;i < len;i++) {
                this.vm.emitPush("constant",curr.value.charCodeAt(i));
                this.vm.emitCall("String.appendChar",2);
            }
        }
        else if(kwc.includes(curr.value)) {
            this.expect(true,"keyword");
            if(curr.value in kwc_map) {
                this.vm.emitPush("constant", kwc_map[curr.value]);
                if(curr.value == "true") this.vm.emitUnaryOp("-");
            }
        }
        else if(curr.type == "identifier") {
            let temp = this.tok.peek(1);
            if(temp.value == "(" || temp.value == ".") this.compileSubroutineCall()
            else if(temp.value == "[") {
                const varName = this.expect(true,"identifier").value;
                this.readVar(varName);
                this.expect("[");
                this.compileExpression();
                this.expect("]");
                this.vm.emitBinaryOp("+");
                this.vm.emitPop("pointer",1);
                this.vm.emitPush("that",0);
            }
            else {
                const varName = this.expect(true,"identifier").value;
                this.readVar(varName);
            }
        }
        else throw new SyntaxError("Something wrong in term!");
    }


    compileExpression() {
        // Sandwich a precedence parser here.
        this.compileTerm();
        let curr = this.tok.peek();
        while(bop.includes(curr.value)) {
            this.expect(curr.value);
            if(!termend.includes(this.tok.peek().value)) {
                this.compileTerm();
                this.vm.emitBinaryOp(curr.value);
            }
            curr = this.tok.peek();
        }
    }
}

module.exports = Compiler;