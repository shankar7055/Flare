import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRouter from "./api/auth";
import tasksRouter from "./api/tasks";
import agentRouter from "./api/agent";
import calendarRouter from "./api/calendar";
import notificationsRouter from "./api/notifications";
import { startScheduler, stopScheduler } from "./scheduler";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing Mapping
app.use("/auth", authRouter);
app.use("/tasks", tasksRouter);
app.use("/agent", agentRouter);
app.use("/calendar", calendarRouter);
app.use("/notifications", notificationsRouter);

// Healthcheck / welcome route
app.get("/", (req, res) => {
  res.json({
    app: "The Last-Minute Life Saver Backend (Node.js & Express)",
    status: "healthy",
    api_docs: "Refer to README.md for endpoint specifications"
  });
});

// Start scheduler
startScheduler();

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
  console.log("Shutting down server gracefully...");
  stopScheduler();
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
