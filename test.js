import fs from "fs-extra";
import fetch from "node-fetch"
import {
    customAlphabet,
} from "nanoid";
let nanoid = customAlphabet("1234567890", 2);
const {
    data
} = JSON.parse(fs.readFileSync("./out.json"));
data.forEach(async (school) => {
    const password = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 8);
    const schoolId = school.name.toLowerCase().split(" ")[0] + school.name.toLowerCase().split(" ")[1] + nanoid() + "@nutopia.in";
    const email = school.email;
    const body = {
        schoolId: schoolId,
        email: email,
        password: `${password()}`
    }

    setTimeout(async () => {
        await fetch("http://localhost:4000/signup", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
    }, 2000)
})
