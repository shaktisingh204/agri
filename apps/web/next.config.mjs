/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  serverExternalPackages: ["@prisma/client", "bcryptjs"]
};

export default nextConfig;
