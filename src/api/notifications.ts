import { Router, Response } from "express";
import prisma from "../db";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT as any);

// GET /notifications
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { sentAt: "desc" }
    });
    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve notification logs" });
  }
});

export default router;
