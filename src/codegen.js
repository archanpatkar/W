var binaryen = require("binaryen");

// Create a module with a single function
var myModule = new binaryen.Module();

myModule.addFunction("add", binaryen.createType([ binaryen.i32, binaryen.i32 ]), binaryen.i32, [ binaryen.i32 ],
  myModule.block(null, [
    myModule.local.set(2,
      myModule.i32.add(
        myModule.local.get(0, binaryen.i32),
        myModule.local.get(1, binaryen.i32)
      )
    ),
    myModule.return(
      myModule.local.get(2, binaryen.i32)
    )
]));

myModule.addFunction("mult", binaryen.createType([binaryen.f32, binaryen.f32]), binaryen.f32, [binaryen.f32], 
myModule.block("body", [
    myModule.local.set(2,
        myModule.f32.mul(
            myModule.local.get(0,binaryen.f32),
            myModule.local.get(1,binaryen.f32)
        )
    ),
    myModule.return(myModule.local.get(2,binaryen.f32))
]));

myModule.addGlobal("pi", binaryen.f64, false, myModule.f64.const(3.142));
myModule.addFunction("test2", binaryen.createType([binaryen.i32]), binaryen.f64, [], 
myModule.block("body", [
    myModule.return(
        myModule.f64.add(
            myModule.global.get("pi",binaryen.f64),
            myModule.f64.convert_s.i32(myModule.local.get(0,binaryen.i32))
        )
    )
]));

myModule.addFunctionExport("add", "add");
myModule.addFunctionExport("mult", "mult");
myModule.addFunctionExport("test2", "test2");

// Optimize the module using default passes and levels
myModule.optimize();

// Validate the module
if (!myModule.validate())
  throw new Error("validation error");

// Generate text format and binary
var textData = myModule.emitText();
console.log(textData);

var wasmData = myModule.emitBinary();

// Example usage with the WebAssembly API
var compiled = new WebAssembly.Module(wasmData);
var instance = new WebAssembly.Instance(compiled, {});
console.log(instance.exports.add(41, 1));
console.log(instance.exports.mult(1.2, 2.33));
console.log(instance.exports.test2(10));