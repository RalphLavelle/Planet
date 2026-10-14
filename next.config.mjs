/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === "1";
const nextConfig = {
  reactStrictMode: true,
  // `STATIC_EXPORT=1 npm run build:static` produces a fully static site in out/ (no server needed).
  ...(isExport ? { output: "export", distDir: ".next-export", trailingSlash: true, images: { unoptimized: true } } : {}),
};
export default nextConfig;
