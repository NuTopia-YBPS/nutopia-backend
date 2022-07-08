import bp from "body-parser";
import cors from "cors";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import "dotenv/config";
import express from "express";
import { initializeApp } from "firebase/app";
import { addDoc, collection, deleteField, doc, getDocs, getFirestore, query, setDoc, updateDoc, where } from "firebase/firestore";
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

const server = express().use(cors()).use(helmet()).use(bp.json());

server.get("/", async (req, res) => {
  res.status(200).json({
    data: "Hello World",
  });
});

server.post("/signup", async (req, res) => {
  const { schoolId, password, email, schoolName } = req.body;
  let success = true;

  if (!req.body)
    return res.status(400).json({
      success: false,
      message: "No body",
    });

  const salt = randomBytes(16).toString("hex");
  const hashedPass = scryptSync(password, salt, 64).toString("hex");
  const obj = {
    schoolId,
    password: `${salt}:${hashedPass}`,
    email,
    schoolName,
  };

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  await setDoc(doc(accountsCollection, schoolId), obj).catch((e) => (success = false));
  db.createData(
    "school_logins",
    `${schoolId}`,
    _.defaultsDeep(obj, {
      realPassword: password,
    }),
  );
  // Send the result
  res.status(200).json({
    success,
    schoolId,
    password,
    email,
    message: "Successfully signed up",
  });
});

server.post("/login", async (req, res) => {
  let success = false;
  let message = "Unable to login";
  if (!req.body)
    return res.status(400).json({
      success,
      message: "No body",
    });
  const {
    user: { schoolId, password },
  } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const accountsCollection = collection(firestore, "school_login_accounts");

  const snapshot = await getDocs(query(accountsCollection, where("schoolId", "==", schoolId)));

  if (snapshot.length === 0)
    return res.status(200).json({
      success,
      message: "Not found",
    });

  const docu = snapshot.docs[0];
  const [salt, key] = docu.get("password").split(":");
  const userToken = scryptSync(schoolId, salt, 16);

  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");

  success = timingSafeEqual(hashedBuffer, keyBuffer);
  let UserToken = userToken.toString("hex");
  try {
    if (success) {
      await updateDoc(doc(accountsCollection, schoolId), {
        userToken: userToken.toString("hex"),
      });
      return res.status(200).json({ message: "Successfully Logged in", success: true, userToken: UserToken });
    }
  } catch (e) {}
  return res.status(400).json({ message: "Unable to login", success: false });
});

server.post("/logout", async (req, res) => {
  const { userToken } = req.body;
  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  try {
    await deleteField(query(accountsCollection, where("userToken", "==", userToken)));
  } catch {
    return res.status(400).json({
      success: false,
      message: "Couldn't log you out, please try again",
    });
  }

  res.status(200).json({
    success: true,
    message: "Successfully logged out",
  });
});

server.post("/mail", async (req, res) => {
  let success = false;
  if (!req.body)
    return res.status(200).json({
      success,
      message: "No body",
    });
  Mail.sendMail({
    from: '"NuTopia" <info@nutopia.in>',
    to: req.body.userEmail,
    cc: [process.env.MAILER_USER],
    html: nunjucks.renderString(htmlBody, req.body.formData),
  })
    .then(() => (success = true))
    .catch((e) => {
      success = false;
    });
  res.status(200).json({
    success,
    message: `Successfully sent mail to ${req.body.userEmail}`,
  });
});

server.post("/register", async (req, res) => {
  const { event, participants, teams, platform, userToken } = req.body;
  const data = {
    event,
    participants,
    teams,
    platform,
  };
  let success = true;
  let message = "Successfully registered";
  if (!req.body)
    return res.status(400).json({
      success: false,
      message: "No body",
    });

  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  const userTokenQuery = query(accountsCollection, where("userToken", "==", userToken));
  const userDocumentSnapShot = await getDocs(userTokenQuery);
  const userDocuments = [];

  userDocumentSnapShot.forEach((doc) => {
    userDocuments.push(doc);
  });
  const schoolId = userDocuments[0].get("schoolId");

  const registrationsCollection = collection(firestore, "registrations_season_2");
  const registrationsSnapshot = await getDocs(registrationsCollection, where("schoolId", "==", schoolId));
  const registrations = [];
  registrationsSnapshot.forEach((doc) => {
    registrations.push(doc);
  });

  if (registrations.length > 0) {
    const phones = [];
    const tmpEvents = [];
    registrations.forEach((registration) => {
      const teamsRef = registration.get("teams");
      if (tmpEvents.includes(registration.get("event"))) {
        tmpEvents.push(registration.get("event"));
      } else {
        success = false;
        message = "Event already registered";
        return res.status(400).json({
          success,
          message,
        });
      }

      if (teamsRef !== undefined) {
        teamsRef.forEach((teamRef) => {
          const membersRef = teamRef["participants"];
          membersRef.forEach((memberRef) => {
            phones.push(memberRef["phone"]);
          });
        });
      } else {
        const participants = registration.get("participants");
        participants.forEach((participant) => {
          phones.push(participant["phone"]);
        });
      }
    });

    if (teams) {
      teams.forEach((team) => {
        team.participants.forEach((participant, index) => {
          let formPhones = [];
          let formNames = [];

          teams.forEach((team) => {
            team.participants.forEach((participant, innerIndex) => {
              if (index !== innerIndex) {
                formPhones.push(participant.phone);
                formNames.push(participant.name);
              }
            });
          });

          if (phones.includes(participant.phone)) {
            success = false;
            message = `Phone number already in use (Participant ${index + 1} : ${participant.phone})`;
          } else if (formPhones.includes(participant.phone)) {
            success = false;
            message = `Phone numbers cannot be same as other members (Participant ${index + 1} : ${participant.phone})`;
          }

          if (formNames.includes(participant.name)) {
            success = false;
            message = `Name cannot be same as other members (Participant ${index + 1} : ${participant.name})`;
          }
        });
      });
    } else {
      participants.forEach((participant, index) => {
        let formPhones = [];
        let formNames = [];

        participants.forEach((participant, innerIndex) => {
          if (index !== innerIndex) {
            formPhones.push(participant.phone);
            formNames.push(participant.name);
          }
        });

        if (phones.includes(participant.phone)) {
          success = false;
          message = `Phone number already in use (Participant ${index + 1} : ${participant.phone})`;
        } else if (formPhones.includes(participant.phone)) {
          success = false;
          message = `Phone numbers cannot be same as participants (Participant ${index + 1} : ${participant.phone})`;
        }

        if (formNames.includes(participant.name)) {
          success = false;
          message = `Name cannot be same as other participants (Participant ${index + 1} : ${participant.name})`;
        }
      });
    }
  }
  res.status(200).json({
    schoolId,
    success,
    message,
  });
  const Data = { ...data };
  const vals = Object.values(data);
  vals.forEach((val, i) => {
    if (val === undefined) delete Data[i];
  });
  if (success) {
    addDoc(registrationsCollection, {
      ...req.body,
      schoolId: schoolId,
    });
  }
});
server.post("/user", async (req, res) => {
  const { userToken } = req.body;
  // Database code here
  const accountsCollection = collection(firestore, "school_login_accounts");
  const userTokenQuery = query(accountsCollection, where("userToken", "==", userToken));
  const userDocumentSnapShot = await getDocs(userTokenQuery).catch(err => {
    return res.status(400).json({
      success: false,
      error: err
    })
  });
  const userDocuments = [];
  userDocumentSnapShot.forEach((doc) => {
    userDocuments.push(doc);
  });

  let success = userDocuments.length > 0

  const userDocument = userDocuments[0]


  const userData = userDocument.data()

  if (!success) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    })
  }
  
  res.status(200).json({
    success: success,
    user:{
      schoolName: userData.schoolName,
      schoolId: userData.schoolId,
      email: userData.email
    }
  });
});
server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});

// Error handling so the server doesn't crash
process
  .on("SIGHUP", () => {})
  .on("SIGABRT", () => {})
  .on("SIGBREAK", () => {})
  .on("SIGKILL", () => {})
  .on("SIGLOST", () => {})
  .on("SIGQUIT", () => {})
  .on("SIGPWR", () => {})
  .on("SIGTERM", () => {})
  .on("beforeExit", () => {})
  .on("exit", () => {})
  .on("multipleResolves", () => {})
  .on("rejectionHandled", () => {})
  .on("uncaughtException", () => {})
  .on("unhandledRejection", () => {})
  .on("SIGSTOP", () => {});
