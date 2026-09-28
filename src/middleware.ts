import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getPasscode, tokenFor } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const passcode = getPasscode();
  if (!passcode) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await tokenFor(passcode))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
