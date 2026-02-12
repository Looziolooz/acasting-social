/** @type {import('next').NextConfig} */
const nextConfig = {
  /* le tue opzioni di configurazione qui */
  images: {
    // Dato che usi Cloudinary e immagini esterne, 
    // assicurati di aver configurato i domini qui se necessario
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'www.acasting.se',
      },
    ],
  },
};

module.exports = nextConfig;