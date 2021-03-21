const sum = require('../src/tokenizer');

// Basic Init
test('adds 1 + 2 to equal 3', () => {
  expect(1+2).toBe(3);
});

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