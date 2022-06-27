import express from "express";
import _ from "lodash";
import fs from "fs-extra";
import bp from "body-parser";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";
import { initializeApp } from "firebase/app";
import nodemailer from "nodemailer";
import { renderString } from "nunjucks";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

import {
  getFirestore,
  collection,
  doc,
  where,
  setDoc,
  getDocs,
  query,
} from "firebase/firestore";

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
  host: "info@nutopia.in",
  port: 587,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.MAILER_EMAIL, // generated ethereal user
    pass: process.env.MAILER_PASS, // generated ethereal password
  },
});

const firestore = getFirestore(app);

const server = express()
  .use(
    cors({
      origin: "*",
    })
  )
  .use(helmet())
  .use(bp.json());

server.get("/", async (req, res) => {
  res.status(200).json({
    data: "Hello World",
  });
});

server.post("/signup", async (req, res) => {
  const { schoolId, password } =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  let success = true;

  if (!req.body)
    return res.status(400).json({ success: false, message: "No body" });

  const salt = randomBytes(16).toString("hex");
  const hashedPass = scryptSync(password, salt, 64).toString("hex");
  const obj = { schoolId, password: `${salt}:${hashedPass}` };

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  await setDoc(doc(accountsCollection, schoolId), obj).catch(
    (e) => (success = false)
  );

  // Send the result
  res.status(200).json({ success, schoolId, password });
});

server.post("/login", async (req, res) => {
  if (!req.body)
    return res.status(400).json({ success: false, message: "No body" });

  const { schoolId, password } =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const accountsCollection = collection(firestore, "school_login_accounts");

  const snapshot = await getDocs(
    query(accountsCollection, where("schoolId", "==", schoolId))
  );

  if (snapshot.length === 0) return res.status(200).json({ success: false });

  const doc = snapshot.docs[0];
  const [salt, key] = doc.get("password").split(":");

  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  const match = timingSafeEqual(hashedBuffer, keyBuffer);

  return res.status(200).json({ success: Boolean(match) });
});
server.post("/register", async (req, res) => {
  Mail.sendMail({html: renderString(htmlBody, {name: "John Doe"})});
});
server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
