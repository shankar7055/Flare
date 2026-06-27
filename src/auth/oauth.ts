import { google } from "googleapis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export class GoogleOAuthHelper {
  static getClient() {
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  static getAuthorizationUrl(userId: number): string {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn("Google OAuth client ID or secret is not configured.");
      return "";
    }
    const client = GoogleOAuthHelper.getClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
      ],
      state: String(userId)
    });
  }

  static async exchangeCode(code: string): Promise<any> {
    const client = GoogleOAuthHelper.getClient();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  /**
   * Refreshes the user's OAuth tokens.
   * Returns the updated tokens, or null if the refresh failed.
   */
  static async refreshUserToken(tokenObj: any): Promise<any> {
    if (!tokenObj || !tokenObj.refresh_token) {
      console.warn("Missing refresh_token in OAuth credentials.");
      return null;
    }

    const client = GoogleOAuthHelper.getClient();
    client.setCredentials(tokenObj);

    try {
      // client.getAccessToken() automatically refreshes the token if expired
      const res = await client.getAccessToken();
      if (!res.token) {
        console.warn("Google getAccessToken returned empty token.");
        return null;
      }
      return client.credentials;
    } catch (error) {
      console.warn("Error refreshing Google OAuth credentials:", error);
      return null;
    }
  }
}
