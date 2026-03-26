import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  const publicPaths = ["/login", "/api/auth", "/invite"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Static assets — no auth required
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return addSecurityHeaders(NextResponse.next());
});

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // HSTS (1 year, include subdomains)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  // Permissions policy — disable sensitive APIs
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  // Basic CSP — allow self, inline styles (Tailwind), and external images/fonts
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob: https://lh3.googleusercontent.com https://photos.hotelbeds.com https://www.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.duffel.com https://serpapi.com wss://*.pusher.com https://*.pusher.com https://sockjs-*.pusher.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
