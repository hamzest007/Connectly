import 'dotenv/config';

const production = process.env.NODE_ENV === 'production';
const secret = (name: string, fallback: string) => {
  const value = process.env[name] ?? '';
  if (production && (!value || value === fallback || value.length < 32)) {
    throw new Error(`${name} must be set to a unique secret of at least 32 characters in production.`);
  }
  return value || fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/connectly',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:8081',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:8081,http://localhost:5173').split(',').map(value => value.trim()),
  accessSecret: secret('JWT_ACCESS_SECRET', 'development-access-secret-change-me'),
  refreshSecret: secret('JWT_REFRESH_SECRET', 'development-refresh-secret-change-me'),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
};
