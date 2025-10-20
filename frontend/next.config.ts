import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    // Enable React strict mode for better debugging
    reactStrictMode: true,
    
    // Environment variables
    env: {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://bahamm.ir',
        NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://bahamm.ir',
    },
    
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
                protocol: "https",
                hostname: "cdn.avaneed.com",
            },
            {
                protocol: "http",
                hostname: "localhost",
            },
            {
                protocol: "http",
                hostname: "127.0.0.1",
            },
            {
                protocol: "https",
                hostname: "images.pexels.com",
            },
            {
                protocol: "https",
                hostname: "picsum.photos",
            },
            {
                protocol: "https",
                hostname: "*.picsum.photos",
            },
        ],
        // Performance optimizations
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ['image/avif','image/webp'],
        minimumCacheTTL: 60,
    },
    
    
    // Performance optimizations
    poweredByHeader: false,
    compress: true,
    
    // Keep experimental features minimal in dev to avoid chunking issues
    experimental: {},
    
    // Webpack optimizations
    webpack: (config, { dev, isServer }) => {
        // Fix for "self is not defined" error with browser-only libraries
        if (isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                'matter-js': false,
                'leaflet': false,
            };
        }
        
        if (!dev) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10
                    }
                }
            };
        }
        return config;
    }
};

export default nextConfig;
