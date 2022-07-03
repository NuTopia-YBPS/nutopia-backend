import { random, customRandom, customAlphabet } from "nanoid";
console.log(removeNumbers(customAlphabet("1234567890abcdefghijklmnoqrstuvwxyz", 100)()).slice(0, 2) + new Date().getMinutes());

function removeNumbers(string) {
  let op = [];
  string.split("").forEach((e) => {
    if (/[0-9]/g.test(e)) op.push(parseInt(e));
  });
  return op.join("");
}
