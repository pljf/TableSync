const configuredOrigins = [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL]
  .concat((process.env.AUTH_TRUSTED_ORIGINS ?? "").split(","))
  .filter(Boolean)
  .flatMap((value) => {
    try {
      return [new URL(value).host];
    } catch {
      return [];
    }
  });

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
      ...(configuredOrigins.length > 0 ? { allowedOrigins: [...new Set(configuredOrigins)] } : {})
    }
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;

