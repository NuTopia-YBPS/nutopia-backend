import express from "express";
import _ from "lodash";
import fs from "fs-extra";
import bp from "body-parser";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";
import { initializeApp } from "firebase/app";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import jsonDB from "json-database";
const db = new jsonDB();
db.createCollection("school_logins");
import { getFirestore, collection, doc, where, setDoc, getDocs, query } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
});

const htmlBody = fs.readFileSync("mail.html", "utf8");

const Mail = nodemailer.createTransport({
  host: process.env.MAILER_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASS,
  },
});

const firestore = getFirestore(app);

const server = express()
  .use(
    cors({
      origin: "*",
    }),
  )
  .use(helmet())
  .use(bp.json());

server.get("/", async (req, res) => {
  res.status(200).json({
    data: "Hello World",
  });
});

server.post("/signup", async (req, res) => {
  const { schoolId, password, email, phoneNumber } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  let success = true;

  if (!req.body) return res.status(400).json({ success: false, message: "No body" });

  const salt = randomBytes(16).toString("hex");
  const hashedPass = scryptSync(password, salt, 64).toString("hex");
  const obj = { schoolId, password: `${salt}:${hashedPass}`, email, phoneNumber };

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  await setDoc(doc(accountsCollection, schoolId), obj).catch((e) => (success = false));
  db.createData("school_logins", `${schoolId}`, _.defaultsDeep(obj, { realPassword: password }));
  // Send the result
  res.status(200).json({ success, schoolId, password, email, phoneNumber });
});

server.post("/login", async (req, res) => {
  if (!req.body) return res.status(400).json({ success: false, message: "No body" });

  const { schoolId, password } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const accountsCollection = collection(firestore, "school_login_accounts");

  const snapshot = await getDocs(query(accountsCollection, where("schoolId", "==", schoolId)));

  if (snapshot.length === 0) return res.status(200).json({ success: false });

  const doc = snapshot.docs[0];
  const [salt, key] = doc.get("password").split(":");
  const userToken = scryptSync(schoolId, salt, 16);

  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  let success = timingSafeEqual(hashedBuffer, keyBuffer);

  await setDoc(doc(accountsCollection, schoolId), {
    userToken: userToken.toString("hex"),
  }).catch((e) => (success = false));

  return res.status(200).json({
    success: Boolean(match),
    userToken: userToken.toString("hex"),
  });
});

server.post("/mail", async (req, res) => {
  Mail.sendMail({
    from: '"NuTopia" <info@nutopia.in>',
    to: req.body.userEmail,
    cc: [process.env.MAILER_USER],
    html: nunjucks.renderString(htmlBody, {
      schoolName: "Yuvabharathi Public School",
      events: [
        {
          name: "<insert event name here>",
          isTeam: true,
          teams: [
            {
              teamName: "<insert team name here>",
              members: [
                {
                  name: "<insert team member name here>",
                  class: "<insert team member class here>",
                },
                {
                  name: "<insert team member name here> 1",
                  class: "<insert team member class here> 1",
                },
              ],
            },
            {
              teamName: "<insert team name here> 1",
              members: [
                {
                  name: "<insert team member name here>",
                  class: "<insert team member class here>",
                },
                {
                  name: "<insert team member name here> 1",
                  class: "<insert team member class here> 1",
                },
              ],
            },
          ],
        },
        {
          name: "<insert event name here> 1",
          isTeam: false,
          participants: [
            {
              name: "<insert team member name here>",
              class: "<insert team member class here>",
            },
            {
              name: "<insert team member name here> 1",
              class: "<insert team member class here> 1",
            },
          ],
        },
      ],
    }),
  });
});

server.post("/userData", async (req, res) => {
  if (!req.body) return res.status(400).json({ success: false, message: "No body" });

  const { schoolId, password } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const accountsCollection = collection(firestore, "school_login_accounts");

  const snapshot = await getDocs(query(accountsCollection, where("schoolId", "==", schoolId)));

  if (snapshot.length === 0) return res.status(200).json({ success: false });

  const doc = snapshot.docs[0];
  const [salt, key] = doc.get("password").split(":");
  const userToken = scryptSync(schoolId, salt, 16);
  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  const match = timingSafeEqual(hashedBuffer, keyBuffer);

  return res.status(200).json({ success: Boolean(match), userToken });
});

server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
