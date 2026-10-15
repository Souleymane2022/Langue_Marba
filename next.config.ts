import type { NextConfig } from "next";

/**
 * Deux modes de publication :
 *  - serveur Node (par défaut) : toutes les fonctions, dont l'assistant IA (/api/ai) ;
 *  - site statique pour GitHub Pages (GITHUB_PAGES=true) : tout sauf l'API, qui ne peut pas
 *    tourner sans serveur. L'assistant IA peut alors appeler une API hébergée ailleurs
 *    (NEXT_PUBLIC_AI_ENDPOINT).
 */
const isStatic = process.env.GITHUB_PAGES === "true";
const basePath = isStatic ? (process.env.BASE_PATH ?? "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  ...(isStatic ? { output: "export" as const, images: { unoptimized: true } } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "true" : "false",
  },
  ...(isStatic
    ? {}
    : {
        async headers() {
          return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
        },
      }),
};

export default nextConfig;
