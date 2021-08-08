const fs = require('fs');
const source = fs.readFileSync(__dirname +'/one.wasm');
var compiled = new WebAssembly.Module(new Uint8Array(source));
var instance = new WebAssembly.Instance(compiled, {});
console.log(instance.exports.test(8));