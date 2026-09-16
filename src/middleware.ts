import { NextRequest, NextResponse } from "next/server";
import { isValidAdminToken } from "@/lib/auth";

// auth.ts uses Node's `crypto` module for HMAC signing, which the default
// Edge runtime doesn't support - run this middleware on the Node.js
// runtime instead (stable in Next.js 15+).
export const runtime = "nodejs";

const COOKIE_NAME = "vecosoft_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";

  if (isLoginPage || isLoginApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!isValidAdminToken(token)) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
