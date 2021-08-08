const Parser = require("./parser");
const { TypeChecker } = require("./type");
const { CodeGen } = require("./codegen");

function compile(data) {
    const p = new Parser(data);
    const ast = p.parse();
    const t = new TypeChecker(p.tok);
    t.check(ast);
    return new CodeGen(ast, t.global, t.functabs).gen();
}

module.exports = compile