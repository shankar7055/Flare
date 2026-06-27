import { Router, Response } from "express";
import prisma from "../db";
import { hashPassword, comparePassword, generateToken, authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { GoogleOAuthHelper } from "../auth/oauth";

const router = Router();

// POST /auth/signup
router.post("/signup", async (req, res) => {
  const { email, password, name, timezone, preferred_channel, working_hours_start, working_hours_end } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing email, password, or name" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name,
        timezone: timezone || "UTC",
        preferredChannel: preferred_channel || "email",
        workingHoursStart: working_hours_start || null,
        workingHoursEnd: working_hours_end || null
      }
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      preferred_channel: user.preferredChannel,
      working_hours_start: user.workingHoursStart,
      working_hours_end: user.workingHoursEnd,
      created_at: user.createdAt.toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create user" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  // Support both OAuth2PasswordBearer form structure (req.body.username/password)
  // and JSON body structure (req.body.email/password)
  const email = req.body.email || req.body.username;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email/username or password" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.hashedPassword))) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = generateToken(user.id);
    return res.status(200).json({ access_token: token, token_type: "bearer" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Login failed" });
  }
});

// GET /auth/google/url (requires authentication)
router.get("/google/url", authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = GoogleOAuthHelper.getAuthorizationUrl(req.user!.id);
    return res.status(200).json({ url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate authorization URL" });
  }
});

// GET /auth/google/callback
router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state parameters" });
  }

  try {
    const userId = Number(state);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tokens = await GoogleOAuthHelper.exchangeCode(String(code));
    if (!tokens.refresh_token) {
      console.warn("No refresh_token returned in Google OAuth callback.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { googleOauthToken: JSON.stringify(tokens) }
    });

    return res.status(200).json({
      status: "success",
      message: "Google Calendar successfully connected! You can close this window."
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to link Google account" });
  }
});

// GET /auth/me (requires authentication)
router.get("/me", authenticateJWT as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      preferred_channel: user.preferredChannel,
      working_hours_start: user.workingHoursStart,
      working_hours_end: user.workingHoursEnd,
      google_calendar_connected: !!user.googleOauthToken,
      created_at: user.createdAt.toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve user profile" });
  }
});

export default router;
