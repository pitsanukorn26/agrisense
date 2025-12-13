import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",              // ✅ สำคัญมากสำหรับ OpenNext

  // Pin the tracing root so Next.js doesn’t pick another directory when multiple lockfiles exist.
  outputFileTracingRoot: path.join(__dirname, ".."),

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
