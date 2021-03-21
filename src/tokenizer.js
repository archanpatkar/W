const {  token, n_chmap, white, keywords, digits, symbols } = require("./tokens");

class Tokenizer {

    static isWhite(c) {
        return white.includes(c);
    }

    static isNumber(c) {
        return digits.includes(c);
    }    

    static isAlphabet(c) {
        if (c) {
            const av = c.charCodeAt(0);
            return av >= "a".charCodeAt(0) && av <= "z".charCodeAt(0) ||
                av >= "A".charCodeAt(0) && av <= "Z".charCodeAt(0);
        } 
        return false;
    }

    constructor(code) {
        this.code = code;
        this.tbuff = [];
        this.ch = null;
        this.curr = 0;
        this.row = 1;
        this.col = 1;
    }

    reset(code) {
        this.code = code;
        this.tbuff = [];
        this.ch = null;
        this.curr = 0;
        this.row = 1;
        this.col = 1;
    }

    generate_error(token,message) {
        // create the error string based on row and column number

    }

    createtok(name,value) {
        return token(name,value,this.col,this.curr,this.row);
    }

    newline() {
        this.row++;
        this.col = 0;
        this.curr++;
        return this.createtok("Newline","\n");
    }

    whitespace() {
        let buff = "";
        this.col = this.curr+1;
        while(this.curr < this.code.length && Tokenizer.isWhite(this.ch=this.code[this.curr])) {
            this.curr++;
            buff += this.ch;
        }
        return this.createtok("Whitespace",buff);
    }

    char() {
        this.col = this.curr+1;
        let v = this.code[++this.curr];
        this.ch = this.code[++this.curr];
        if(this.ch != "'") {
            // throw an error!
        }
        this.curr++;
        return this.createtok("charConstant",v);
    }

    string() {
        let buff = "";
        this.ch = this.code[++this.curr];
        this.col = this.curr+1;
        while(this.ch !== '"' && this.curr < this.code.length) {
            buff += this.ch
            this.ch = this.code[++this.curr];
        }
        this.curr++;
        return this.createtok("stringConstant",buff);
    }

    number() {
        let dot = false;
        let n = "" + this.ch;
        this.col = this.curr+1;
        this.ch = this.code[++this.curr];
        if(this.ch == ".") {
            dot = true;
            n += this.ch;
            this.ch = this.code[++this.curr];
        }
        while (Tokenizer.isNumber(this.ch)) {
            n += this.ch;
            this.ch = this.code[++this.curr];
            if(this.ch == ".") {
                if(!dot) {
                    dot = true;
                    n += this.ch;
                    this.ch = this.code[++this.curr];
                }
                else { 
                    // Throw lex error 
                    throw new Error("LEX ERROR: using more than one dot on numbers!");
                }
            }
        }
        if(dot) return this.createtok("floatConstant",parseFloat(n));
        return this.createtok("intConstant",parseInt(n));
    }

    symbols() {
        this.curr++;
        if(this.ch === "/") {
            if(this.code[this.curr] === "/") {
                this.ch = this.code[++this.curr]
                while(this.ch != "\n") this.ch = this.code[++this.curr];
                this.curr++;
            }
            else if(this.code[this.curr] === "*") {
                this.curr++;
                this.ch = this.code[++this.curr];
                while(!(this.code[this.curr-1] == "*" && this.ch == "/")) this.ch = this.code[++this.curr];
                this.curr++;
            }
            else return this.createtok("symbol", ch);
        }
        return this.createtok("symbol", ch);
    }

    iden_kw() {
        n = "" + ch;
        ch = string[++curr];
        while (Tokenizer.isAlphabet(ch) || ch == "_") {
            n += ch;
            ch = string[++curr];
        }
        if (keywords.includes(n)) tokens.push(token("keyword", n));
        else tokens.push(token("identifier", n));
    }

    unknown_ch() {
        // Throw an error
        throw new Error(`Unrecognized Symbol '${this.ch}'`)
    }

    tokenize(string=this.code) {
        if (this.curr < this.code.length) {
            this.ch = this.code[this.curr];
            if(this.ch === "\n") return this.newline();
            else if (Tokenizer.isWhite(this.ch)) return this.whitespace();
            else if(this.ch === "'") return this.char();
            else if(this.ch === '"') return this.string();
            else if (symbols.includes(this.ch)) return this.symbols();
            else if (Tokenizer.isNumber(this.ch)) return this.number();
            else if (Tokenizer.isAlphabet(this.ch) || this.ch == "_") return this.iden_kw();
            else this.unknown_ch();
        }
        return this.createtok("EOF",0);
    }

    peek(n=0) { 
        if(n) {
            if(this.tbuff.length < n) 
                for(let i = 0;(i < n) && this.curr < this.code.length;i++) this.tbuff.push(this.tokenize());
            return this.curr[n-1];
        } 
        return this.curr[0];
    }

    next() { 
        if(this.curr < this.code.length && !this.tbuff.length) 
            this.tbuff.push(this.tokenize());
        let temp = this.tbuff.shift();
        return temp;
    }
}

module.exports = Tokenizer;

// const t1 = new Tokenizer(
// `       10      20 22   2223  40  
//     2.344 6.75 982.34
//     "hello this is archan patkar"
//     'a' 'r' 'p'
// `
// );
// let tk = t1.next();
// while(tk.type != "EOF") {
//     console.log(tk.toString())
//     tk = t1.next();
// }