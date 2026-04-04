// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // Role mismatch redirects: logged in as wrong role → send to correct login
    if (pathname.startsWith("/publisher/") && role && role !== "publisher" && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/advertiser/login";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/advertiser/") && role && role !== "advertiser" && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/publisher/login";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin/") && role && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = role === "advertiser" ? "/advertiser/login" : "/publisher/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Public routes — allow without token
        const publicRoutes = [
          "/publisher/login",
          "/publisher/register",
          "/advertiser/login",
          "/advertiser/register",
        ];
        if (publicRoutes.some((r) => pathname.startsWith(r))) return true;

        // Everything else under protected prefixes requires auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/publisher/:path*", "/advertiser/:path*", "/admin/:path*"],
};
