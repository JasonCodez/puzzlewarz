import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateSameOrigin } from "@/lib/requestSecurity";

export async function GET(request: NextRequest) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  // Get the current session
  const session = await getServerSession(authOptions);

  // Create response that clears the session
  const response = NextResponse.json({ success: true });

  // Clear NextAuth session cookies
  response.cookies.set("next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("next-auth.csrf-token", "", {
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("next-auth.callback-url", "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}
