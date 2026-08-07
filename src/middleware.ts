import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*", "/calendar/:path*", "/customers/:path*", "/pos/:path*",
    "/sales/:path*", "/staff/:path*", "/payroll/:path*", "/services/:path*", "/reports/:path*", "/settings/:path*",
  ],
};
