export const db = {
  mongoDB_URI: process.env.MONGO_DB_URI,
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE ?? "5"),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE ?? "10"),
};

export const jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
};

export const server = {
  port: process.env.PORT ?? 8080,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
