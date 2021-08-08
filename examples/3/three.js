const fs = require('fs');
const source = fs.readFileSync(__dirname + '/three.wasm');
var compiled = new WebAssembly.Module(new Uint8Array(source));
var instance = new WebAssembly.Instance(compiled, {});
console.log(instance.exports.add(1, 2));