import express, { json } from "express";
import cors from "cors";

import connectDB from "./config/database.js";

const app = express();

connectDB();

app.use(cors());
app.use(json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI KYC Automation System API Running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});