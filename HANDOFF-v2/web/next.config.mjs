// Next.js работает на порту 3001, а учебный API — на порту 3000.
// Эти правила делают для браузера один адрес: запросы к /api и /uploads
// незаметно передаются локальному бэкенду. В интернет ничего не отправляется.
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:3000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
