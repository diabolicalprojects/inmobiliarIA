import Redis from "ioredis";

// Configurar URL de Redis del usuario
const REDIS_URL = process.env.REDIS_URL || "redis://default:Alonso--_001@demo-redisn8n-hzkss2:6379";

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Necesario para algunas librerías de queue si se usan a futuro
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export default redis;
