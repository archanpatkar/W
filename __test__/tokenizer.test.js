const  Tokenizer = require('../src/tokenizer');


// Basic Init
test('Double dot checking', () => {
  expect(() => new Tokenizer(`10.3.4`).next())
      .toThrowError(/multiple dots/); 
  expect(() => new Tokenizer(`1..4`).next()).toThrowError(/multiple dots/);
});

test('Char checking', () => {
  expect(() => new Tokenizer(`'a`).next())
      .toThrowError(/`'`/); 
  expect(() => {
    const temp = new Tokenizer(`4'`)
    temp.next();
    temp.next();
  }).toThrowError(/`'`/);
  expect(() => console.log(new Tokenizer(`'1`).next())).toThrowError(/`'`/);
});

// Testing
// 

// try {
//     t1.next();
// } catch(e) {
//     console.log(e.message);
// }

// try {
//     t1.reset("'a");
//     t1.next();
// } catch(e) {
//     console.log(e.message);
// }

// try {
//     t1.reset('"this is a test');
//     t1.next();
// } catch(e) {
//     console.log(e.message);
// }

// try {
//     t1.reset(`
//         "this is a test"
//         @
//     `);
//     console.log(t1.next().toString());
//     console.log(t1.next());
//     console.log(t1.next());
//     console.log(t1.next());
//     console.log(t1.next());
//     console.log(t1.next());
//     console.log(t1.next());
// } catch(e) {
//     console.log("");
//     console.log(e.message);
// }



// const t1 = new Tokenizer(
// `       10      20 22   2223  40  
//     2.344 6.75 982.34
//     "hello this is archan patkar"
//     'a' 'r' 'p'
// `
// );
// let tk = t1.next();
// while(tk.type != "EOF") {
//     console.log(tk.toString())
//     tk = t1.next();
// }