import { NextRequest, NextResponse } from "next/server";
import { isValidAdminToken, getAdminCookieName } from "@/lib/auth";
import { parseCandidateSessionToken, getCandidateCookieName } from "@/lib/candidateAuth";

// Both auth.ts and candidateAuth.ts use Node's `crypto` module for HMAC
// signing, which the default Edge runtime doesn't support.
export const runtime = "nodejs";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Admin area (obscured path - see README for why it's not /admin) ---
  if (pathname.startsWith("/portal-x7k2")) {
    if (pathname === "/portal-x7k2/login") return NextResponse.next();

    const token = req.cookies.get(getAdminCookieName())?.value;
    if (!isValidAdminToken(token)) {
      return NextResponse.redirect(new URL("/portal-x7k2/login", req.url));
    }
    return NextResponse.next();
  }

  // --- Candidate assessment area ---
  if (pathname.startsWith("/assessment")) {
    if (pathname === "/assessment/login") return NextResponse.next();

    const token = req.cookies.get(getCandidateCookieName())?.value;
    const session = parseCandidateSessionToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/assessment/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal-x7k2/:path*", "/assessment/:path*"],
};
