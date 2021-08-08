const Parser = require("./parser");
const { TypeChecker } = require("./type");
const { CodeGen } = require("./codegen");

function compile(code) {
    const par = new Parser(code);
    const ast = par.parse();
    const tch = new TypeChecker(par.tok);
    tch.check(ast);
    return new CodeGen(ast, tch.getSymbolTable()).gen();
}

module.exports = compile;