const Tokenizer = require("./tokenizer");
const Parser = require("./parser");
const { TypeChecker } = require("./type");
const { CodeGen } = require("./codegen");

function compile(code) {
    const tok = new Tokenizer(code);
    const par = new Parser(tok);
    const ast = par.parse();
    const tch = new TypeChecker(tok);
    tch.check(ast);
    return new CodeGen(ast, tch.getSymbolTable()).gen();
}

module.exports = compile;