import type { NextConfig } from 'next';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@bloklabs/core', 'retard-texteditor'],
  outputFileTracingRoot: repoRoot,
  experimental: {
    externalDir: true
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'retard-texteditor': path.join(repoRoot, 'src/index.js')
    };
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      path.join(repoRoot, 'node_modules'),
      ...(config.resolve.modules || [])
    ];
    return config;
  }
};

export default nextConfig;
