const {  
    token, 
    toktypes,
    n_chmap, 
    white, 
    keywords, 
    digits, 
    symbols
} = require("./tokens");
                                                                                                                                          
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
        this.reset(code);
    }

    reset(code) {
        this.code = code;
        this.lines = code.split("\n");
        this.tbuff = [];
        this.ch = null;
        this.prevCurr = 0;
        this.curr = 0;
        this.row = 1;
        this.col = 1;
    }

    generate_error(token,message,context=2,dch="^",mpad=-3) {
        // creating beautified error string based on row, column number and message
        let msg = [];
        const start = token.row-context > 0?token.row-context:1;
        const end = token.row+context <= this.lines.length?token.row+context:token.row+1;
        for(let i = start;i < end;i++) {
            msg.push(`${i}| ${this.lines[i-1]}`)
            if(i === token.row) {
                const padding = `${token.row}`.length+token.ecol+2;
                msg.push(dch.padStart(padding));
                msg.push("".padStart(padding+mpad) + message);
            }
        }
        throw new Error(msg.join("\n"));
    }

    createtok(name,value,offset=0) {
        return token(name,value,this.col,(this.curr-this.prevCurr)+offset,this.row);
    }

    newline() {
        this.row++;
        this.prevCurr = this.curr;
        this.col = 0;
        this.curr++;
        return this.createtok(toktypes.newline,n_chmap.NL);
    }

    whitespace() {
        let buff = "";
        this.col = this.curr+1;
        while(this.curr < this.code.length && Tokenizer.isWhite(this.ch=this.code[this.curr])) {
            this.curr++;
            buff += this.ch;
        }
        return this.createtok(toktypes.whitespace,buff);
    }

    char() {
        this.col = this.curr+1;
        let v = this.code[++this.curr];
        this.ch = this.code[++this.curr];
        if(this.ch != "'") {
            this.generate_error(
                this.createtok("",this.ch,1),
                "Missing `'` symbol"
            );
        }
        this.curr++;
        return this.createtok(toktypes.char,v);
    }

    string() {
        let buff = "";
        this.ch = this.code[++this.curr];
        this.col = this.curr+1;
        while(this.ch !== '"' && this.curr < this.code.length) {
            buff += this.ch
            this.ch = this.code[++this.curr];
        }
        if(this.ch !== '"') {
            this.generate_error(
                this.createtok("",this.ch),
                'Missing `"` symbol'
            );
        }
        this.curr++;
        return this.createtok(toktypes.string,buff);
    }

    number() {
        let dot = 0;
        let n = "" + this.ch;
        this.col = this.curr+1;
        this.ch = this.code[++this.curr];
        if(this.ch == n_chmap.DOT) {
            dot = 1;
            n += this.ch;
            this.ch = this.code[++this.curr];
        }
        while (Tokenizer.isNumber(this.ch) || this.ch === n_chmap.DOT) {
            if(this.ch === n_chmap.DOT) {
                if(dot) {
                    // Throw lex error 
                    this.curr++;
                    this.generate_error(
                        this.createtok("",this.ch),
                        "Using multiple dots on number literal"
                    );
                    // throw new Error("LEX ERROR: using more than one dot on numbers!");
                }
                else { 
                    dot = true;
                    n += this.ch;
                    this.ch = this.code[++this.curr];
                }
            }
            n += this.ch;
            this.ch = this.code[++this.curr];
        }
        console.log(n)
        if(dot) return this.createtok(toktypes.float,parseFloat(n));
        return this.createtok(toktypes.integer,parseInt(n));
    }

    symbols() {
        this.curr++;
        if(this.ch === n_chmap.SLASH) {
            if(this.code[this.curr] === n_chmap.SLASH) {
                this.ch = this.code[++this.curr]
                while(this.ch != n_chmap.NL) this.ch = this.code[++this.curr];
                this.curr++;
            }
            else if(this.code[this.curr] === n_chmap.STAR) {
                this.curr++;
                this.ch = this.code[++this.curr];
                while(!(this.code[this.curr-1] == n_chmap.STAR && this.ch == n_chmap.SLASH)) 
                    this.ch = this.code[++this.curr];
                this.curr++;
            }
            else return this.createtok(toktypes.symbol, ch);
        }
        return this.createtok(toktypes.symbol, ch);
    }

    iden_kw() {
        let n = "" + this.ch;
        this.ch = this.code[++this.curr];
        while (Tokenizer.isAlphabet(this.ch) || this.ch == n_chmap.UNDERSCORE) {
            n += this.ch;
            this.ch = this.code[++this.curr];
        }
        if (keywords.includes(n)) tokens.push(token(toktypes.keyword, n));
        else tokens.push(token(toktypes.identifier, n));
    }

    unknown_ch() {
        this.generate_error(
            this.createtok("",this.ch),
            "Unrecognized Symbol"
        );
    }

    tokenize(string=this.code) {
        if (this.curr < this.code.length) {
            this.ch = this.code[this.curr];
            if(this.ch === n_chmap.NL) return this.newline();
            else if (Tokenizer.isWhite(this.ch)) return this.whitespace();
            else if(this.ch === n_chmap.SQuote) return this.char();
            else if(this.ch === n_chmap.DQuote) return this.string();
            else if (symbols.includes(this.ch)) return this.symbols();
            else if (Tokenizer.isNumber(this.ch)) return this.number();
            else if (Tokenizer.isAlphabet(this.ch) || this.ch == n_chmap.UNDERSCORE) return this.iden_kw();
            else this.unknown_ch();
        }
        return this.createtok(n_chmap.EOF,0);
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

try {
    console.log(new Tokenizer(`1..4`).next());
} catch(e) {
    console.log(e.message);
}

module.exports = Tokenizer;