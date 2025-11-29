import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    // Disable React strict mode temporarily to debug hooks issue
    reactStrictMode: false,
	
	// Development mode optimizations
	swcMinify: true,
	modularizeImports: {
		'@/components': {
			transform: '@/components/{{member}}'
		}
	},
	
	// Add permissive headers for static assets/fonts to avoid 403 via tunnels/proxies
	async headers() {
		return [
			{
				source: '/_next/static/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
					{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
				],
			},
			{
				source: '/fonts/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
				],
			},
		];
	},
    
    // Environment variables - no defaults here to avoid baking localhost URLs into production build
    // Defaults are handled at runtime in utils/api.ts based on NODE_ENV
    env: {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    },
    
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "bahamm.ir",
            },
            {
                protocol: "https",
                hostname: "app.bahamm.ir",
            },
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
    
    
    // Redirect backend API requests to the actual backend
    async rewrites() {
        return [
            {
                source: '/backend/api/:path*',
                destination: 'http://127.0.0.1:8001/api/:path*',
            },
        ];
    },
    
    // Performance optimizations
    poweredByHeader: false,
    compress: true,
    
    // Keep experimental features minimal in dev to avoid chunking issues
    experimental: {},
    
    // Webpack optimizations
    webpack: (config, { dev, isServer }) => {
        // Development mode performance optimizations
        if (dev) {
            // Reduce work in development
            config.optimization.removeAvailableModules = false;
            config.optimization.removeEmptyChunks = false;
            config.optimization.splitChunks = false;
        }
        
        // Fix for "self is not defined" error with browser-only libraries
        if (isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                'matter-js': false,
                'leaflet': false,
                'react-leaflet': false,
                'react-custom-roulette': false,
            };
            
            // Add Node.js polyfill for self - inject at the top of server bundle
            const webpack = require('webpack');
            config.plugins.push(
                new webpack.BannerPlugin({
                    banner: 'if (typeof self === "undefined") { globalThis.self = globalThis; }',
                    raw: true,
                    entryOnly: false,
                })
            );
        }
        
        // Add fallbacks for browser-only modules
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
            crypto: false,
            stream: false,
            url: false,
            zlib: false,
            http: false,
            https: false,
            assert: false,
            os: false,
            path: false,
        };
        
        if (!dev && !isServer) {
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
        
        // Disable chunking for server builds to avoid self reference issues
        if (isServer) {
            config.optimization.splitChunks = false;
        }
        return config;
    }
};

export default nextConfig;
