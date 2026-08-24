/** @type {import('next').NextConfig} */
const nextConfig = {
  // Two lockfiles exist on purpose (repo root + web/), so Next would infer the
  // repo root as the workspace root. On Windows that misinference can send
  // Turbopack's postcss workers into an unbounded respawn loop that exhausts
  // all RAM (vercel/next.js#92978) — pin the root to this app.
  turbopack: { root: import.meta.dirname },
  // Dynamic filesystem access in career-ops.ts (careerOpsRoot() + fs) makes
  // Turbopack trace the whole repo as server output, bloating the Vercel
  // lambda and triggering "Dynamic filesystem access causes tracing of the
  // whole project" warnings. career-ops data lives in the parent checkout
  // (or CAREER_OPS_ROOT) and is read at runtime — never bundled.
  outputFileTracingRoot: import.meta.dirname,
  outputFileTracingExcludes: {
    "*": [
      "../data/**/*",
      "../reports/**/*",
      "../jds/**/*",
      "../output/**/*",
      "../.career-ops-web/**/*",
      "../interview-prep/**/*",
      "../batch/**/*",
      "./.next/**/*",
      "**/data/**/*",
      "**/reports/**/*",
      "**/jds/**/*",
      "**/output/**/*",
      "**/.career-ops-web/**/*",
      "**/interview-prep/**/*",
      "**/batch/**/*",
    ],
  },
  // Allow a throwaway build dir (e.g. BUILD_DIST=.next-prod) so a production
  // `next build` can run without clobbering a live `next dev` .next.
  ...(process.env.BUILD_DIST ? { distDir: process.env.BUILD_DIST } : {}),
};

export default nextConfig;
