import express, { json } from "express";
import cors from "cors";
import { APP_NAME } from "./config/constants.js";
import { authRoutes } from "./routes/authRoutes.js";

import connectDB from "./config/database.js";

const app = express();

await connectDB();

app.use(cors());
app.use(json());

app.use("/api/v1/auth", authRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy"
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${APP_NAME} API Running`
  });
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});