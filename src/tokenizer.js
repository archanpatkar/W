const {
    token, 
    toktypes,
    n_chmap, 
    white, 
    keywords, 
    // digits, 
    symbols
} = require("./tokens");
                                                                                                                                          
class Tokenizer {

    static isWhite(c) {
        return white.includes(c);
    }

    static isNumber(c) {
        return c.match(/[0-9]/)?true:false;
    }    

    static isAlphabet(c) {
        return c.match(/[A-Za-z]/)?true:false;
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
        let msg = ["\n"];
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
        if(dot) return this.createtok(toktypes.float,parseFloat(n));
        return this.createtok(toktypes.integer,parseInt(n));
    }

    symbols() {
        this.curr++;
        // add all the multichar ops!!!
        if(this.ch === n_chmap.BANG && this.code[this.curr] === n_chmap.ASSGN) 
            return ++this.curr && this.createtok(toktypes.symbol, n_chmap.NEQ);
        if(this.ch === n_chmap.GT && this.code[this.curr] === n_chmap.ASSGN) 
            return ++this.curr && this.createtok(toktypes.symbol, n_chmap.GTE);
        if(this.ch === n_chmap.LT && this.code[this.curr] === n_chmap.ASSGN) 
            return ++this.curr && this.createtok(toktypes.symbol, n_chmap.LTE);
        if(this.ch === n_chmap.ASSGN && this.code[this.curr] === n_chmap.ASSGN) 
            return ++this.curr && this.createtok(toktypes.symbol, n_chmap.EQ);
        return this.createtok(toktypes.symbol, this.ch);
    }

    iden_kw() {
        let n = "" + this.ch;
        this.ch = this.code[++this.curr];
        while (Tokenizer.isAlphabet(this.ch) || Tokenizer.isNumber(this.ch) || this.ch == n_chmap.UNDERSCORE) {
            n += this.ch;
            this.ch = this.code[++this.curr];
        }
        if (keywords.includes(n)) return this.createtok(toktypes.keyword, n)
        else return this.createtok(toktypes.identifier, n);
    }

    unknown_ch() {
        this.generate_error(
            this.createtok("",this.ch),
            "Unrecognized Symbol"
        );
    }

    // add multi line comments
    slinecomment() {
        this.curr += 2;
        this.ch = this.code[this.curr];
        while(this.ch !== n_chmap.NL) {
            this.curr++;
            this.ch = this.code[this.curr];
        }
    }

    mlinecomment() {
        this.curr += 2;
        this.ch = this.code[this.curr];
        console.log(this.ch);
        while(
            (this.curr < this.code.length) && 
            (this.ch !== n_chmap.STAR) && 
            (this.code[this.curr + 1] !== n_chmap.SLASH)
        ) {
            this.ch = this.code[++this.curr];
        }
        this.curr += 2;
        this.ch = this.code[this.curr];
    }

    tokenize(string=this.code) {
        if (this.curr < this.code.length) {
            this.ch = this.code[this.curr];
            if (this.ch === n_chmap.SLASH && 
               this.code[this.curr+1] === n_chmap.SLASH) this.slinecomment();
            if (this.ch === n_chmap.SLASH && 
                this.code[this.curr+1] === n_chmap.STAR) this.mlinecomment();
            if (this.ch === n_chmap.NL) return this.newline();
            if (Tokenizer.isWhite(this.ch)) return this.whitespace();
            if (this.ch === n_chmap.SQUO) return this.char();
            if (this.ch === n_chmap.DQUO) return this.string();
            if (symbols.includes(this.ch)) return this.symbols();
            if (Tokenizer.isNumber(this.ch)) return this.number();
            if (Tokenizer.isAlphabet(this.ch) || this.ch === n_chmap.UNDERSCORE) return this.iden_kw();
            this.unknown_ch();
        }
        return this.createtok(n_chmap.EOF,0);
    }

    peek(n=1,eatwh=true) { 
        if(this.tbuff.length-1 < n) {
            const len = this.tbuff.length-1;
            for(let i = 0;i < (n-len);i++) {
                const t = this.tokenize();
                if(t.type === toktypes.whitespace && eatwh) n++;
                this.tbuff.push(t);
            }
            return this.tbuff[n];
        }
        return this.tbuff[n];
    }

    next() { 
        if(this.tbuff.length === 0) {
            const top = this.tokenize();
            this.tbuff.push(this.tokenize());
            return top;
        }
        const top = this.tbuff.shift();
        this.tbuff.push(this.tokenize());
        return top;
    }
}

module.exports = Tokenizer;