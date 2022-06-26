import express, { query } from "express";
import _ from "lodash";
import fs from "fs-extra";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";
import bodyParser from "body-parser";
import { initializeApp } from "firebase/app";
import { DocumentData, getDocs, query, QueryDocumentSnapshot, where, collection, getFirestore } from "firebase/firestore";
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

const firestore = getFirestore(app);

const server = express()
  .use(cors({ origin: "*" }))
  .use(helmet())
  .use(express.text());

server.get("/", async (req, res) => {
  res.status(200).json({ data: "Hello World" });
});
server.post("/register", async (req, res) => {
  let success = false;
  // Querying
  const { schoolId, events } = typeof req.body === "string" ? JSON.parse(req?.body) : req.body;

  const schoolQuery = query(collection(firestore, "registrations"), where("schoolId", "==", schoolId));
  const matchedData = await getDocs(schoolQuery);
  // Check Query
  matchedData.forEach(async (data, index) => {
    console.log(data);
  });

  // Send the result
  res.status(200).json({ success });
});
server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
