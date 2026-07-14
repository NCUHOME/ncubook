import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    // Allow CORS for the Docusaurus frontend
    outputFileTracingRoot: path.join(__dirname),
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
