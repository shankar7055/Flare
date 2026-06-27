import { PrismaClient } from "@prisma/client";
import { GoogleOAuthHelper } from "./src/auth/oauth";
import { google } from "googleapis";

const prisma = new PrismaClient();

async function cleanupCalendar() {
  const user = await prisma.user.findFirst({ where: { email: "demo@lifesaver.ai" } });
  if (!user || !user.googleOauthToken) {
    console.error("No user or token found");
    return;
  }

  const parsedToken = JSON.parse(user.googleOauthToken);
  const auth = GoogleOAuthHelper.getClient();
  auth.setCredentials(parsedToken);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  now.setHours(0, 0, 0, 0); // start of today
  const endPeriod = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: endPeriod.toISOString(),
    singleEvents: true,
    orderBy: "startTime"
  });

  const items = response.data.items || [];
  console.log(`Found ${items.length} total events in window.`);

  let hiEventsDeleted = 0;
  const testTitles = ["Hi", "test", "multi", "Step 1: Task Breakdown", "Write Monthly Report Draft"];
  for (const item of items) {
    if (item.summary && testTitles.includes(item.summary)) {
      console.log(`Deleting stray event: "${item.summary}" (ID: ${item.id})`);
      await calendar.events.delete({
        calendarId: "primary",
        eventId: item.id as string
      });
      hiEventsDeleted++;
    }
  }

  if (hiEventsDeleted > 0) {
    console.log(`Deleted ${hiEventsDeleted} stray event(s). Refetching final list...`);
  }

  const finalResponse = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: endPeriod.toISOString(),
    singleEvents: true,
    orderBy: "startTime"
  });

  const finalItems = finalResponse.data.items || [];
  console.log("\n--- Final Clean Google Calendar Events ---");
  if (finalItems.length === 0) {
    console.log("No events remain on Google Calendar in this window.");
  } else {
    finalItems.forEach(item => {
      console.log(`- [${item.start?.dateTime || item.start?.date}] ${item.summary}`);
    });
  }
}

cleanupCalendar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
