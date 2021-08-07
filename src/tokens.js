const { tagged } = require("styp");

const token = tagged("Token",["type","value","scol","ecol","row"]);

const toktypes = {
    newline:"newline",
    integer:"intConstant",
    float:"floatConstant",
    // char:"charConstant",
    // string:"strConstant",
    // bool:"boolConstant",
    whitespace:"whitespace",
    symbol:"symbol",
    identifier:"identifier",
    keyword:"keyword",
};

const symbols = [
    "(", ")", "{", "}", "[", "]", ";",
    ".", "+", "-", "/", "*", ",", "=",
    "&", "|", "<", ">", "~", ":"
];

const keywords = [
    "fn",  "const", "export", "null", 
    "return", "void", "if", "else", "while", 
    "true", "false", "let", "for", "bool", 
    "do", "and", "or", "not", "i32", "i64", "f32", 
    "f64", "void"
    // "field", "static", "method", "this", "class", "constructor",
];

// "var",

const white = [" ", "\b", "\t", "\r"];

const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const kw_map = {
    fn:"fn",
    let:"let",
    const:"const",
    return:"return",
    while:"while",
    export:"export",
    // var: "var",
    i32: "i32",
    i64: "i64",
    f32: "f32",
    f64: "f64",
    void: "void",
    if: "if",
    else: "else",
    bool: "bool",
    and: "and",
    or: "or",
    not: "not"
}

const n_chmap = {
    DOT:".",
    COMMA:",",
    COLON:":",
    SUB:"-",
    ADD:"+",
    GT:">",
    LT:"<",
    SEMICOLON:";",
    NL: "\n",
    DIV: "/",
    MUL: "*",
    SLASH: "/",
    STAR: "*",
    UNDERSCORE:"_",
    SQUO:"'",
    DQUO:'"',
    LPAREN: "(",
    RPAREN: ")",
    LCURB: "{",
    RCURB: "}",
    ASSGN:"=",
    EOF:"EOF",
    EQ: "=="
};

// const ch_nmap = {

// };

module.exports = {
    white: white,
    digits: digits,
    n_chmap: n_chmap,
    // ch_nmap: ch_nmap,
    keywords: keywords,
    symbols: symbols,
    token: token,
    toktypes:toktypes,
    kw_map:kw_map
};