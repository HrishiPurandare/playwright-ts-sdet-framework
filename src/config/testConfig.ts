export default {
  baseUrl: process.env.BASE_URL || 'http://localhost:3100',
  credentials: {
    username: process.env.APP_USERNAME || 'demo',
    password: process.env.APP_PASSWORD || 'demo-password',
  },
};
