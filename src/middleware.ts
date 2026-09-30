import { NextResponse, type NextRequest } from "next/server";

// A fast first gate: no session cookie, no admin. The real check (session lookup,
// timeouts, UA binding) runs in every admin page, action and API route.
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hd_admin" : "hd_admin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname.startsWith("/admin/") ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/preview/:path*", "/api/admin/:path*"],
};
