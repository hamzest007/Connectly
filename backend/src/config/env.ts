import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/connectly',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:8081',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:8081,http://localhost:5173').split(',').map(value => value.trim()),
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret-change-me',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
};
