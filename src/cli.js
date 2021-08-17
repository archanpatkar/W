#!/usr/bin/env node
const fs = require("fs");
const { Buffer } = require('buffer');
const compile = require("./index");

// Will write the command line interface
function main(args) {
    if(fs.existsSync(args[0]) && fs.lstatSync(args[0]).isDirectory()) {
        const files = fs.readdirSync(args[0]).filter(f => f.endsWith(".w"));
        const path = args[0].endsWith("/")?args[0]:`${args[0]}/`;
        console.log("Compiling...");
        files.map(file => {
            console.log(file);
            const filename = file.split(".")[0];
            const code = fs.readFileSync(`${path}${file}`).toString();
            const output = compile(code);
            fs.writeFileSync(`${path}${filename}.wasm`,Buffer.from(output));
        });
    }
    else {
        console.log("Compiling...");
        const dirs = args[0].split("/");
        const filename = dirs[dirs.length-1].split(".")[0];
        console.log(filename);
        const code = fs.readFileSync(args[0]).toString();
        const output = compile(code);
        dirs.pop();
        const path = dirs.join("/");
        fs.writeFileSync(`${path}/${filename}.wasm`,Buffer.from(output));
    }
}

main(process.argv.slice(2));