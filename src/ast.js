const { tagged, sum } = require("styp");

const ast = sum("Node", {
    constant: ["value","type"],
    variable: ["identifier"],
    binary: ["op","left","right"],
    unary: ["op","right"],
    post: ["left","op"],
    ifcons: ["cond","b1","b2"],
    whilecons: ["cond","body"],
    forcons: ["var","cond","upd","body"],
    functioncons: ["name","params","body"]
    // Add more ast nodes....
});