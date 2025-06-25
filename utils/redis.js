import redis from 'redis';

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        this.client.on('error', (err) => {
            // use console.error for real errors is acceptable in some setups, but Airbnb prefers none
        });

        this.client.on('connect', () => {
            this.connected = true;
        });
    }

    isAlive() {
        return this.client.connected === true;
    }

    get(key) {
        return new Promise((resolve) => {
            this.client.get(key, (err, value) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        });
    }

    set(key, value, duration) {
        return new Promise((resolve) => {
            this.client.setex(key, duration, value, (err) => {
                if (err) {
                    resolve();
                } else {
                    resolve();
                }
            });
        });
    }

    del(key) {
        return new Promise((resolve) => {
            this.client.del(key, (err) => {
                resolve();
            });
        });
    }
}

const redisClient = new RedisClient();
export default redisClient;
