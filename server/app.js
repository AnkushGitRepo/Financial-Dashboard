import express from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./routes/userRouter.js";
import marketRouter from "./routes/marketRoutes.js";
import { removeUnverifiedAccounts } from "./automation/removeUnverifiedAccounts.js";
import getLiveMarketData from "./market/live_market.js";

export const app = express();

app.get("/api/v1/market/live", async (req, res) => {
  try {
    const data = await getLiveMarketData();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/market", marketRouter);
app.use("/api/v1/user", userRouter);

removeUnverifiedAccounts();

app.use(errorMiddleware);