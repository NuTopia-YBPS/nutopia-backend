import csv from "csvtojson";
import fs from "fs-extra";

csv()
  .fromFile("./Book2.csv")
  .then((jsonObj) => {
    const data = [];
    jsonObj.forEach((row, i) => {
      const Row1 = row["AffNo,School & Head Name"].split("\n")[0];
      const Row2 = row["Address,Phone & Email"].split("\n")[0];
      if (Row1.includes("Name: �") && !Row1.includes("Head/Principal") && Row2.includes("Email:�")) {
        data.push({
          name: Row1.replace("Name: �", ""),
          email: Row2.replace("Email:�", ""),
        });
      }
    });
    // data.forEach((e, i) => {
    //   if (Object.keys(data[i]).length !== 0) op.push(e);
    // });
    console.log(data);
  });
