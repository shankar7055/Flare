import { Router, Response } from "express";
import prisma from "../db";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { GoogleOAuthHelper } from "../auth/oauth";
import { google } from "googleapis";

const router = Router();

router.use(authenticateJWT as any);

// GET /calendar/events
router.get("/events", async (req: AuthenticatedRequest, res: Response) => {
  const days = Number(req.query.days || 7);
  const now = new Date();
  const endPeriod = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const eventsList: any[] = [];

  // Attempt Google Calendar
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (user && user.googleOauthToken) {
    try {
      const parsedToken = JSON.parse(user.googleOauthToken);
      const refreshedToken = await GoogleOAuthHelper.refreshUserToken(parsedToken);
      if (refreshedToken) {
        // Save if changed
        if (JSON.stringify(refreshedToken) !== user.googleOauthToken) {
          await prisma.user.update({
            where: { id: req.user!.id },
            data: { googleOauthToken: JSON.stringify(refreshedToken) }
          });
        }

        const auth = GoogleOAuthHelper.getClient();
        auth.setCredentials(refreshedToken);
        const calendar = google.calendar({ version: "v3", auth });

        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: now.toISOString(),
          timeMax: endPeriod.toISOString(),
          singleEvents: true,
          orderBy: "startTime"
        });

        const items = response.data.items || [];
        items.forEach((item: any) => {
          eventsList.push({
            id: item.id,
            title: item.summary || "Busy",
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            source: "google_calendar"
          });
        });

        return res.status(200).json(eventsList);
      }
    } catch (e: any) {
      console.warn("Failed to retrieve Google Calendar events list, falling back to DB:", e);
    }
  }

  // Database Fallback
  try {
    const slots = await prisma.scheduleSlot.findMany({
      where: {
        task: { userId: req.user!.id },
        startTime: { gte: now },
        endTime: { lte: endPeriod }
      },
      include: { task: true }
    });

    const formattedSlots = slots.map(s => ({
      id: `db_${s.id}`,
      title: s.task.title,
      start: s.startTime.toISOString(),
      end: s.endTime.toISOString(),
      source: "database"
    }));

    return res.status(200).json(formattedSlots);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve calendar slots" });
  }
});

export default router;
