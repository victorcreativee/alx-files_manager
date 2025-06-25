// utils/redis.js
import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        this.client.on('error', (err) => {
            console.error('Redis error:', err);
        });

        this.isConnected = true;

        this.client.on('connect', () => {
            this.isConnected = true;
        });

        this.client.on('end', () => {
            this.isConnected = false;
        });

        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.setex).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);
    }

    isAlive() {
        return this.isConnected;
    }

    async get(key) {
        return this.getAsync(key);
    }

    async set(key, value, duration) {
        return this.setAsync(key, duration, value);
    }

    async del(key) {
        return this.delAsync(key);
    }
}

const redisClient = new RedisClient();
export default redisClient;
