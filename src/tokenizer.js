const { tagged } = require("styp");

const token = tagged("Token",["type","value","scol","ecol","row"]);

const symbols = [
    "(", ")", "{", "}", "[", "]", ";",
    ".", "+", "-", "/", "*", ",", "=",
    "&", "|", "<", ">", "=", "~"
];
const keywords = [
    "class", "constructor", "fn", "this", "const",
    "null", "return", "void", "if", "method",
    "else", "while", "true", "false", "let",
    "field", "static", "var", "int", "char",
    "boolean", "do", "and", "or", "not"
];

// "\n"
const white = [" ", "\b", "\t", "\r"];
function isWhite(c) {
    return white.includes(c);
}

const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
function isNumber(c) {
    return digits.includes(c);
}

function isAlphabet(c) {
    if (c) {
        const av = c.charCodeAt(0);
        return av >= "a".charCodeAt(0) && av <= "z".charCodeAt(0) ||
            av >= "A".charCodeAt(0) && av <= "Z".charCodeAt(0);
    }
    return false;
}

// function token(name, value) {
//     return { type: name, value: value };
// }

// function tokenize(string) {
//     const tokens = [];
//     let ch;
//     let curr = 0;

//     while (curr < string.length) {
//         ch = string[curr]
//         if (isWhite(ch)) curr++;
//         else if(ch == '"') {
//             buff = ""
//             ch = string[++curr]
//             while(ch !== '"' && curr < string.length) {
//                 buff += ch
//                 ch = string[++curr]
//             }
//             curr++;
//             // ch = string[++curr]
//             tokens.push(token("stringConstant", buff))
//         }
//         else if (symbols.includes(ch)) {
//             curr++;
//             if(ch === "/") {
//                 if(string[curr] === "/") {
//                     ch = string[++curr]
//                     while(ch != "\n") ch = string[++curr];
//                     curr++;
//                 }
//                 else if(string[curr] === "*") {
//                     curr++;
//                     ch = string[++curr];
//                     while(!(string[curr-1] == "*" && ch == "/")) ch = string[++curr];
//                     curr++;
//                 }
//                 else tokens.push(token("symbol", ch));
//             }
//             else tokens.push(token("symbol", ch));
//         }
//         else if (isNumber(ch)) {
//             n = "" + ch;
//             ch = string[++curr];
//             while (isNumber(ch)) {
//                 n += ch;
//                 ch = string[++curr];
//             }
//             tokens.push(token("integerConstant", parseInt(n)));
//         }
//         else if (isAlphabet(ch) || ch == "_") {
//             n = "" + ch;
//             ch = string[++curr];
//             while (isAlphabet(ch) || ch == "_") {
//                 n += ch;
//                 ch = string[++curr];
//             }
//             if (keywords.includes(n)) tokens.push(token("keyword", n));
//             else tokens.push(token("identifier", n));
//         }
//         else curr++;
//     }
//     tokens.push(token("EOF",0));
//     return tokens;
// }


class Tokenizer {
    constructor(code) {
        this.code = code;
        this.stream = this.tokenize();
        this.done = false;
        this.curr = [this.stream.next()];
    }

    reset(code) {
        this.code = code;
        this.stream = this.tokenize();
        this.curr = [this.stream.next()];
    }

    *tokenize(string=this.code) {
        let ch;
        let curr = 0;
        let row = 1;
        let col = 1;
        while (curr < string.length) {
            ch = string[curr];
            if(ch === "\n") {
                row++;
                col = 0;
                curr++;
                yield token("Newline","\n",col,curr,row);
            }
            if (isWhite(ch)) {
                let buff = ""
                col = curr+1;
                while(curr < string.length && isWhite(ch=string[curr])) {
                    curr++;
                    buff += ch;
                }
                yield token("Whitespace",buff,col,curr,row);
            }
            else if(ch === "'") {
                col = curr+1;
                let v = string[++curr];
                ch = string[++curr];
                if(ch != "'") {
                    // throw an error!
                }
                curr++;
                yield token("charConstant",v,col,curr,row);
            }
            else if(ch === '"') {
                let buff = "";
                ch = string[++curr];
                col = curr+1;
                while(ch !== '"' && curr < string.length) {
                    buff += ch
                    ch = string[++curr]
                }
                curr++;
                // ch = string[++curr]
                yield token("stringConstant",buff,col,curr,row);
            }
            else if (isNumber(ch)) {
                let dot = false;
                let n = "" + ch;
                col = curr+1;
                ch = string[++curr];
                if(ch == ".") {
                    dot = true;
                    n += ch;
                    ch = string[++curr];
                }
                while (isNumber(ch)) {
                    n += ch;
                    ch = string[++curr];
                    if(ch == ".") {
                        if(!dot) {
                            dot = true;
                            n += ch;
                            ch = string[++curr];
                        }
                        else { 
                            // Throw lex error 
                            throw new Error("LEX ERROR: using more than one dot on numbers!");
                        }
                    }
                }
                if(dot) yield token("floatConstant",parseFloat(n),col,curr,row);
                else yield token("intConstant",parseInt(n),col,curr,row);
            }
        }
        return token("EOF",0,0,0,0);
    }

    pulltok() {
        const tk = this.stream.next()
        this.done = tk.done;
        return tk.value;
    }

    peek(n=0) { 
        if(n) {
            if(this.curr.length < n) 
                for(let i = 0;(i < n) && !this.done;i++) this.curr.push(this.pulltok());
            return this.curr[n-1];
        } 
        return this.curr[0];
    }

    next() { 
        let temp = this.curr.shift();
        if(!this.curr.length && !this.done) 
            this.curr.push(this.pulltok());
        return temp;
    }
}

module.exports = Tokenizer;

const t1 = new Tokenizer(
`       10      20 22   2223  40  
    2.344 6.75 982.34
    "hello this is archan patkar"
    'a' 'r' 'p'
`
);
let tk = t1.next();
while(tk.type != "EOF") {
    console.log(tk.toString())
    tk = t1.next();
}