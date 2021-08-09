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
  const b: i64 = i64(1) + 1;
  const c: f32 = 3.142;
  return d/2.0;
}

export fn test(b: i32): i32 {
    for(let i: i32 = 0; i < 15; i = i + 1) {
        if(i == b) {
            break;
        }
    }
    return i;
}

export fn test3(b: i32): i32 {
    for(let i: i32 = 0; i < 15; i = i + 1) {
        if(i < b) {
            continue;
        }
        return -1 * i;
    }
    return i;
}

export fn times(n: i32,m: i32): i32 {
    let i: i32;
    let sum: i32 = 0;
    for(i = 0; i < m; i = i + 1) {
        sum = sum + n;
    }
    return sum;
}

export fn factorial(n: i32): i32 {
  if(n == 0) {
    return 1;
  }
  return n * factorial(n-1);
}

export fn f2():f32 {
  let t: f32 = 1;
  return t / 2.0 / 3.0;
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