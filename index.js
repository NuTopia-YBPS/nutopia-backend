import bp from "body-parser";
import cors from "cors";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "crypto";
import "dotenv/config";
import express from "express";
import {
  initializeApp
} from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import fs from "fs-extra";
import helmet from "helmet";
import _ from "lodash";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import jsonDB from "./jsonDb.js";
const db = new jsonDB();
db.createCollection("school_logins");

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
});

// Read the shitty nunjucks template from html file
const htmlBody = fs.readFileSync("mail.html", "utf8");

// Mail Provider
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
      origin: "*"
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
  const {
    schoolId,
    password,
    email
  } = req.body;
  let success = true;

  if (!req.body) return res.status(400).json({
    success: false,
    message: "No body"
  });

  const salt = randomBytes(16).toString("hex");
  const hashedPass = scryptSync(password, salt, 64).toString("hex");
  const obj = {
    schoolId,
    password: `${salt}:${hashedPass}`,
    email
  };

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  await setDoc(doc(accountsCollection, schoolId), obj).catch((e) => (success = false));
  db.createData("school_logins", `${schoolId}`, _.defaultsDeep(obj, {
    realPassword: password
  }));
  // Send the result
  res.status(200).json({
    success,
    schoolId,
    password,
    email
  });
});

server.post("/login", async (req, res) => {
  if (!req.body) return res.status(400).json({
    success: false,
    message: "No body"
  });
  const {
    user: {
      schoolId,
      password
    }
  } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const accountsCollection = collection(firestore, "school_login_accounts");

  const snapshot = await getDocs(query(accountsCollection, where("schoolId", "==", schoolId)));

  if (snapshot.length === 0) return res.status(200).json({
    success: false
  });

  const docu = snapshot.docs[0];
  const [salt, key] = docu.get("password").split(":");
  const userToken = scryptSync(schoolId, salt, 16);

  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  let success = timingSafeEqual(hashedBuffer, keyBuffer);

  await updateDoc(doc(accountsCollection, schoolId), {
    userToken: userToken.toString("hex"),
  }).catch((e) => (success = false));

  return res.status(200).json({
    success: Boolean(success),
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
      events: [{
          name: "<insert event name here>",
          isTeam: true,
          teams: [{
              teamName: "<insert team name here>",
              members: [{
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
              members: [{
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
          participants: [{
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
  if (!req.body) return res.status(400).json({
    success: false,
    message: "No body"
  });

  const {
    schoolId,
    password
  } = req.body;

  const accountsCollection = collection(firestore, "registrations_season2");
  const snapshot = await getDocs(query(accountsCollection, where("schoolId", "==", schoolId)));

  console.log(snapshot);
  return;
  if (snapshot.length === 0) return res.status(200).json({
    success: false
  });

  const docu = snapshot.docs[0];
  docu.get("")
  const [salt, key] = docu.get("password").split(":");
  const userToken = scryptSync(schoolId, salt, 16);
  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  const match = timingSafeEqual(hashedBuffer, keyBuffer);

  return res.status(200).json({
    success: Boolean(match),
    userToken
  });
});

server.post("/validate", async (req, res) => {
  const {
    event,
    participants,
    teams,
    platform
  } = req.body;
  console.log(req.body)
  return;
  let success = true;

  if (!req.body) return res.status(400).json({
    success: false,
    message: "No body"
  });

  const salt = randomBytes(16).toString("hex");
  const hashedPass = scryptSync(password, salt, 64).toString("hex");
  const obj = {
    schoolId,
    password: `${salt}:${hashedPass}`,
    email
  };

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  await setDoc(doc(accountsCollection, schoolId), obj).catch((e) => (success = false));

});


server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
