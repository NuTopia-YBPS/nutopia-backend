// import csv from "csvtojson";
import fs from "fs-extra";
// import { customAlphabet } from "nanoid";
// let nanoid = customAlphabet("1234567890", 4);
const { data } = JSON.parse(fs.readFileSync("./out.json"));
// const d = [];
// data.forEach((school, i) => {
//   let e = false;
//   let schoolshort = "";
//   school.name.split(" ").forEach((e) => (schoolshort += e[0]));
//   if(schoolshort === "CPS" && !e) schoolshort = "CGPS"

//   // schoolshort += "#";
//   // schoolshort += nanoid(4);
//   if (!d.includes(schoolshort)) d.push(schoolshort);
//   else throw new Error(`${school.name}-${schoolshort}`);
//   // fetch("http://localhost:4000");
//   console.log(schoolshort);
// });
console.log(data.length)