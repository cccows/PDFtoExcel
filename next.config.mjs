/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Add support for WebAssembly files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    
    // Add rule to handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })
    
    return config
  }
}

export default nextConfig
