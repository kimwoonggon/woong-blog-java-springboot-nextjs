import type { NextConfig } from "next";

const devProxyOrigin = process.env.DEV_PROXY_ORIGIN?.replace(/\/$/, '')

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "frame-src https://www.youtube-nocookie.com",
      "connect-src 'self' https:",
      "object-src 'none'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wrkainkcjswuuotxztrx.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/vi/**',
      },
    ],
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    if (!devProxyOrigin) {
      return []
    }

    return [
      {
        source: '/api/:path*',
        destination: `${devProxyOrigin}/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${devProxyOrigin}/media/:path*`,
      },
    ]
  },
};

export default nextConfig;
