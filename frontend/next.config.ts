import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "atticbv.com",
            },
            {
                protocol: "https",
                hostname: "avaneed.com",
            },
            {
                protocol: "http",
                hostname: "localhost",
            },
            {
                protocol: "https",
                hostname: "images.pexels.com",
            },
        ],
    }
};

export default nextConfig;
