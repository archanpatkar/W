# W Lang
A WASM native language

### Example

#### `W code`
```
const pi: f64 = 3.141;

fn sqr(n: f64): f64 {
  return (n * n);
}

export fn area(r: f64): f64 {
   return (pi * sqr(r));
}

export fn factorial(n: i32): i32 {
  if(n == 0) {
    return 1;
  }
  return n * factorial(n-1);
}
```

#### `Javascript Code`
```javascript
const module = new WebAssembly.Module(wasmData);
const instance = new WebAssembly.Instance(module, {});
console.log(instance.exports.area(3.7));
console.log(instance.exports.factorial(6));
```