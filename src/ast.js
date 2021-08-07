const { sum } = require("styp");

const ast = sum("Node", {
    identifier: ["name"],
    constant: ["value", "type"],
    constdef: ["iden", "type", "expr"],
    letdef: ["iden", "type", "expr"],
    funcdef: ["name","params","rettype","body"],
    paramdef: ["name", "type"],
    block: ["statements"],
    ifdef: ["exp","body1","body2"],
    whiledef: ["exp","body"],
    binary: ["op","left","right","type"],
    unary: ["op","right","type"],
    funccall: ["func","args"],
    returndef: ["exp"],
    exportdef: ["decl"],
    // dowhilecons: ["cond","body"],
    // forcons: ["var","cond","upd","body"],
    // Add more ast nodes....
});


module.exports = ast;