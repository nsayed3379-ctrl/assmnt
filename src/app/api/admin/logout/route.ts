import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  const url = new URL("/portal-x7k2/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(getAdminCookieName(), "", { path: "/", maxAge: 0 });
  return res;
}
