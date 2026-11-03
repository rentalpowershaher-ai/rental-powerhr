const nextConfig = {
  serverExternalPackages: ['firebase-admin', 'web-push'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}
export default nextConfig
