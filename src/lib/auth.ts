import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Adapter } from "next-auth/adapters";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

//  Validates and retrieves NextAuth required environment variables.
//  throws {Error} If required environment variables are missing or invalid
function validateNextAuthConfig(): void {
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!nextAuthSecret || nextAuthSecret.trim().length === 0) {
    throw new Error(
      "Missing NEXTAUTH_SECRET environment variable. " +
      "Generate one using: openssl rand -hex 32"
    );
  }

  if (!nextAuthUrl || nextAuthUrl.trim().length === 0) {
    console.warn(
      "Warning: NEXTAUTH_URL is not set. " +
      "NextAuth will try to auto-detect it, but it's recommended to set it explicitly."
    );
  }
}

//  Retrieves Google OAuth credentials from environment variables.
//  returns {Object} Object containing clientId and clientSecret
//  throws {Error} If GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are missing or empty
function getGoogleCredentials(): { clientId: string; clientSecret: string } {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId.trim().length === 0) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID environment variable. " +
      "Please check your .env.local file and ensure it's configured correctly. " +
      "Get it from: https://console.cloud.google.com/apis/credentials"
    );
  }

  if (!clientSecret || clientSecret.trim().length === 0) {
    throw new Error(
      "Missing GOOGLE_CLIENT_SECRET environment variable. " +
      "Please check your .env.local file and ensure it's configured correctly. " +
      "Get it from: https://console.cloud.google.com/apis/credentials"
    );
  }

  // Validate format (Google Client IDs typically end with .apps.googleusercontent.com)
  const trimmedClientId = clientId.trim();
  if (!trimmedClientId.includes(".apps.googleusercontent.com")) {
    console.warn(
      `Warning: GOOGLE_CLIENT_ID doesn't appear to be in the correct format. ` +
      `Received: ${trimmedClientId.substring(0, 20)}... ` +
      `It should end with '.apps.googleusercontent.com'. ` +
      `Please verify it's correct in Google Cloud Console.`
    );
  }

  return { 
    clientId: trimmedClientId, 
    clientSecret: clientSecret.trim() 
  };
}

// Validate configuration on module load
try {
  validateNextAuthConfig();
  const googleCreds = getGoogleCredentials();
  console.log(
    `✓ Google OAuth configured (Client ID: ${googleCreds.clientId.substring(0, 20)}...)`
  );
} catch (error) {
  console.error("❌ NextAuth configuration error:", error instanceof Error ? error.message : error);
  // Re-throw to prevent the app from starting with invalid configuration
  throw error;
}

export const authOptions: NextAuthOptions = {
  adapter: UpstashRedisAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      ...getGoogleCredentials(),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const dbUser = (await db.get(`user:${token.id}`)) as User | null;

      if (!dbUser) {
        token.id = user.id;
        return token;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.name = token.name;
      }
      return session;
    },
    redirect() {
      return "/dashboard";
    },
  },
};
