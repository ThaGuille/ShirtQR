/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow next/image to optimize photos served from Supabase Storage.
    // next/image auto-resizes + serves WebP/AVIF -> fast on bad signal.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
