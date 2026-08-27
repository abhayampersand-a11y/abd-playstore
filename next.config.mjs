/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next build` and `next dev` both write to `.next`, so a verification build
  // run while the dev server is up deletes chunks that server is still serving
  // and it starts throwing ENOENT. Setting NEXT_DIST_DIR gives a build its own
  // output directory, leaving a running dev server untouched.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // google-play-scraper is a CommonJS package that performs runtime requires.
  // Keeping it external stops the bundler from mangling it.
  serverExternalPackages: ['google-play-scraper'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'play-lh.googleusercontent.com' },
      { protocol: 'https', hostname: '*.ggpht.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
