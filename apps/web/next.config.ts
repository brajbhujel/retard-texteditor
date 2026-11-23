import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@bloklabs/core', 'retard-texteditor'],
  experimental: {
    externalDir: true
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'retard-texteditor': path.resolve(__dirname, '../../src/index.js')
    };
    return config;
  }
};

export default nextConfig;
