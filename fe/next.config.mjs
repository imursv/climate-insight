/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "noaadata.apps.nsidc.org",
        pathname: "/NOAA/G02135/**",
      },
    ],
  },
};

export default nextConfig;
