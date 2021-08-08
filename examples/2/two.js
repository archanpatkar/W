const fs = require('fs');
const source = fs.readFileSync(__dirname +'/two.wasm');
var compiled = new WebAssembly.Module(new Uint8Array(source));
var instance = new WebAssembly.Instance(compiled, {});
console.log(instance.exports.x.value);
console.log(instance.exports.y.value);
console.log(instance.exports.f1(0, 20));
console.log(instance.exports.test2());
console.log(instance.exports.factorial(5));
