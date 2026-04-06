/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  serverExternalPackages: ["bcryptjs", "pdf-parse"],
  transpilePackages: ["@agri/shared"]
};

export default nextConfig;
