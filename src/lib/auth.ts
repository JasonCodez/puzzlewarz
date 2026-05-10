import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkLocalRateLimit } from "@/lib/requestSecurity";
import {
  BETA_ACCESS_ERROR,
  hasBetaAccess,
  isBetaAllowlistedEmail,
} from "@/lib/betaAccess";

const requireEmailVerification =
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  // Enforce secure cookie flags in production
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: { 
        httpOnly: true, 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      }
    },
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();

        // Rate limit: 10 login attempts per email per 15 minutes
        if (checkLocalRateLimit({ key: `auth:login:email:${email}`, limit: 10, windowMs: 15 * 60 * 1000 })) {
          throw new Error("Too many login attempts. Please wait 15 minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        if (requireEmailVerification && !user.emailVerified) {
          throw new Error("Email not verified. Please check your inbox for the verification link.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        let betaApproved = user.betaApproved;

        if (isBetaAllowlistedEmail(email) && !betaApproved) {
          await prisma.user.update({
            where: { id: user.id },
            data: { betaApproved: true },
          });
          betaApproved = true;
        }

        if (!hasBetaAccess({ email: user.email, role: user.role, betaApproved })) {
          throw new Error(BETA_ACCESS_ERROR);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          betaApproved,
        };
      },
    }),
    // Uncomment to enable OAuth providers
    // GitHubProvider({
    //   clientId: process.env.GITHUB_ID || "",
    //   clientSecret: process.env.GITHUB_SECRET || "",
    // }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID || "",
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    // }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signOut() {
      // This is called when user signs out
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const signedInUser = user as {
          id?: string;
          role?: string;
          betaApproved?: boolean;
        };
        token.id = signedInUser.id;
        token.role = signedInUser.role ?? "user";
        token.betaApproved = signedInUser.betaApproved === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as {
          id?: string;
          role?: string;
          betaApproved?: boolean;
        };
        sessionUser.id = token.id as string;
        sessionUser.role = typeof token.role === "string" ? token.role : "user";
        sessionUser.betaApproved = token.betaApproved === true;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
