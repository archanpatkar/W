export const x: f32 = 1.44;
export const y: i32 = 100;
export const z: i64 = 5030445;
let t: i32 = (-2);

fn main(){
  let k: i32 = 3;
}

export fn identity(i: i32): i32 {
  return i;
}

export fn test2(): f64 {
  const d: f64 = 4.0;
  const a: i32 = 1;
  const b: i64 = 2;
  const c: f32 = 3.142;
  return d/2.0;
}

export fn factorial(n: i32): i32 {
  if(n == 0) {
    return 1;
  }
  return n * factorial(n-1);
}

export fn f2():f32 {
  return 1.0 / 2.0 / 3.0;
}

export fn f1(a: i32, b: i32): i32 {
  let k: f64 = 1.4;
  let i: i32 = 10;
  main();
  (-5);
  1 + 2;
  t = (9 * 2);
  // k = 3.3333;
  k = test2();
  if(a) {
    let d: i32 = t;
    let e: i32;
    return d + i * y;
  } else {
    while(i < 20) {
      i = (i + 1);
    }
    return identity(i);
  }
  return i;
}