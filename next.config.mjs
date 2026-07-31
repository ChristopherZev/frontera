/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native module — must stay external to the bundler if a server route
  // ever imports lib/db.ts. Local/CI analytics only; not for deployed routes.
  serverExternalPackages: ["@duckdb/node-api"],
};

export default nextConfig;
