const { tagged } = require("styp");

const token = tagged("Token",["value","type","srow","scol","erow","ecol"]);

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
    "boolean", "do"
];

const white = [" ", "\n", "\b", "\t", "\r"];
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

function token(name, value) {
    return { type: name, value: value };
}

function tokenize(string) {
    const tokens = [];
    let ch;
    let curr = 0;
    while (curr < string.length) {
        ch = string[curr]
        if (isWhite(ch)) curr++;
        else if(ch == '"') {
            buff = ""
            ch = string[++curr]
            while(ch !== '"' && curr < string.length) {
                buff += ch
                ch = string[++curr]
            }
            curr++;
            // ch = string[++curr]
            tokens.push(token("stringConstant", buff))
        }
        else if (symbols.includes(ch)) {
            curr++;
            if(ch === "/") {
                if(string[curr] === "/") {
                    ch = string[++curr]
                    while(ch != "\n") ch = string[++curr];
                    curr++;
                }
                else if(string[curr] === "*") {
                    curr++;
                    ch = string[++curr];
                    while(!(string[curr-1] == "*" && ch == "/")) ch = string[++curr];
                    curr++;
                }
                else tokens.push(token("symbol", ch));
            }
            else tokens.push(token("symbol", ch));
        }
        else if (isNumber(ch)) {
            n = "" + ch;
            ch = string[++curr];
            while (isNumber(ch)) {
                n += ch;
                ch = string[++curr];
            }
            tokens.push(token("integerConstant", parseInt(n)));
        }
        else if (isAlphabet(ch) || ch == "_") {
            n = "" + ch;
            ch = string[++curr];
            while (isAlphabet(ch) || ch == "_") {
                n += ch;
                ch = string[++curr];
            }
            if (keywords.includes(n)) tokens.push(token("keyword", n));
            else tokens.push(token("identifier", n));
        }
        else curr++;
    }
    tokens.push(token("EOF",0));
    return tokens;
}


class Tokenizer {
    constructor(code) {
        this.tokens = tokenize(code);
        this.curr = this.tokens[0];
        this.tokens.shift();
    }

    peek(n=0) { 
        if(n) return this.tokens[n-1]; 
        return this.curr;
    }

    next() { 
        let curr = this.curr;
        this.curr = this.tokens.shift(); 
        return curr;
    }
}

module.exports = Tokenizer;