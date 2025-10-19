/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'media.licdn.com' }
    ],
  },
  webpack: (config, { isServer }) => {
    // Ensure webpack runtime uses a universal global object (fixes `self` on server)
    config.output = config.output || {};
    config.output.globalObject = 'globalThis';
    return config;
  },
};

module.exports = nextConfig;


