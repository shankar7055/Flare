import { Router, Response } from "express";
import prisma from "../db";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { runAgentCycle, runRescueCycle } from "../agent/orchestrator";
import { getUserPatterns } from "../agent/tools";

const router = Router();

// Apply auth middleware to all agent endpoints
router.use(authenticateJWT as any);

// GET /agent/patterns
router.get("/patterns", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patterns = await getUserPatterns(req.user!.id);
    return res.status(200).json(patterns);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve user patterns" });
  }
});

// POST /agent/run
router.post("/run", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const run = await runAgentCycle(req.user!.id, "manual");
    
    return res.status(200).json(run ? {
      ...run,
      reasoningTrace: JSON.parse(run.reasoningTrace),
      actionsTaken: JSON.parse(run.actionsTaken)
    } : {
      id: -1,
      userId: req.user!.id,
      triggerType: "manual",
      reasoningTrace: [{ role: "model", parts: [{ text: "An agent cycle is already running for you. Please wait for the current sweep to finish." }] }],
      actionsTaken: [],
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Agent cycle failed:", error);
    return res.status(500).json({ error: error.message || "Agent cycle execution failed" });
  }
});

// POST /agent/run-rescue/:task_id
router.post("/run-rescue/:task_id", async (req: AuthenticatedRequest, res: Response) => {
  const taskId = Number(req.params.task_id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const run = await runRescueCycle(req.user!.id, taskId);
    
    return res.status(200).json(run ? {
      ...run,
      reasoningTrace: JSON.parse(run.reasoningTrace),
      actionsTaken: JSON.parse(run.actionsTaken)
    } : {
      id: -1,
      userId: req.user!.id,
      triggerType: "rescue_mode",
      reasoningTrace: [{ role: "model", parts: [{ text: "An agent cycle is already running for you. Please wait for the current sweep to finish." }] }],
      actionsTaken: [],
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Rescue cycle failed:", error);
    return res.status(500).json({ error: error.message || "Rescue cycle execution failed" });
  }
});

// GET /agent/runs
router.get("/runs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const runs = await prisma.agentRun.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });

    const parsedRuns = runs.map(run => ({
      ...run,
      reasoningTrace: JSON.parse(run.reasoningTrace),
      actionsTaken: JSON.parse(run.actionsTaken)
    }));

    return res.status(200).json(parsedRuns);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve agent runs" });
  }
});

// GET /agent/runs/:id
router.get("/runs/:id", async (req: AuthenticatedRequest, res: Response) => {
  const runId = Number(req.params.id);
  if (isNaN(runId)) {
    return res.status(400).json({ error: "Invalid run ID" });
  }

  try {
    const run = await prisma.agentRun.findFirst({
      where: { id: runId, userId: req.user!.id }
    });

    if (!run) {
      return res.status(404).json({ error: "Agent run not found" });
    }

    return res.status(200).json({
      ...run,
      reasoningTrace: JSON.parse(run.reasoningTrace),
      actionsTaken: JSON.parse(run.actionsTaken)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve agent run" });
  }
});

export default router;
