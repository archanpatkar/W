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

const white = [" ", "\b", "\t", "\r"];

const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const n_chmap = {
    DOT:".",
    NL: "\n",
};

const ch_nmap = {

};

module.exports = {
    white: white,
    digits: digits,
    n_chmap: n_chmap,
    ch_nmap: ch_nmap,
    keywords: keywords,
    symbols: symbols,
    token: token
};