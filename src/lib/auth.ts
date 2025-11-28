import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Adapter } from "next-auth/adapters";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

function getGoogleCredetials() {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientSecret || clientSecret.length === 0) {
    throw new Error("Missing google clientSecret");
  }

  if (!clientId || clientId.length === 0) {
    throw new Error("Missing google client ID");
  }

  return { clientId, clientSecret };
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
      clientId: getGoogleCredetials().clientId,
      clientSecret: getGoogleCredetials().clientSecret,
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
