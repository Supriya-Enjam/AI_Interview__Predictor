
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();

  if (
    !payload?.sub ||
    !payload.email ||
    !payload.email_verified
  ) {
    throw new Error("Google account verification failed.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    ...(payload.picture ? { picture: payload.picture } : {}),
  };
}
