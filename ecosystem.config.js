module.exports = {
  apps: [
    {
      name: 'hone-api',
      script: '/home/ubuntu/hone/apps/api/dist/main.js',
      cwd: '/home/ubuntu/hone/apps/api',
      env_file: '/home/ubuntu/hone/apps/api/.env',
    },
    {
      name: 'hone-web',
      script: 'pnpm',
      args: 'start --port 3000',
      cwd: '/home/ubuntu/hone/apps/web',
    },
    {
      name: 'hone-admin',
      script: 'pnpm',
      args: 'start --port 3002',
      cwd: '/home/ubuntu/hone/apps/admin',
    },
    {
      name: 'hone-marketing',
      script: 'pnpm',
      args: 'start --port 3003',
      cwd: '/home/ubuntu/hone/apps/marketing',
    },
  ],
};
