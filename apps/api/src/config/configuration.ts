export default () => ({
  appName: process.env.APP_NAME ?? "AgriSphere Crop Calendar",
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000"
});

