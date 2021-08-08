/*
    this is a function 
*/

export fn test(i: i32): bool {
    let f: f32 = 9.5;
    if(i < 5) {
        return -1;
    }
    if(i > 10) {
        return -2;
    }
    i = i32(f);
    do{
        false and true;
        i = i + 1;
    }while(i < 9);
    for(;i < 15;i = i + 1) {
        if(i < 13) {
            continue;
        }
        break;
    }
    false or not false and true;
    return i;
}