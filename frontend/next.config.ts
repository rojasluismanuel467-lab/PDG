import type { NextConfig } from "next";

const normalizeProxyTarget = (value: string) => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `http://${value}`;
};

const apiProxyTarget = normalizeProxyTarget(
  process.env.API_PROXY_TARGET || "127.0.0.1:8000"
);

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  turbopack: {
    // Evita que Next infiera un root incorrecto cuando hay lockfiles en otros niveles.
    // Debe ser una ruta absoluta.
    root: process.cwd(),
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
