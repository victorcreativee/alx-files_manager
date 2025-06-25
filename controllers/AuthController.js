// controllers/AuthController.js
import sha1 from 'sha1';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
    static async getConnect(req, res) {
        const header = req.header('Authorization') || '';
        const token = header.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = Buffer.from(token, 'base64').toString();
        const [email, password] = decoded.split(':');
        const user = await dbClient.db.collection('users').findOne({ email, password: sha1(password) });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const authToken = uuidv4();
        await redisClient.set(`auth_${authToken}`, user._id.toString(), 24 * 3600);

        res.status(200).json({ token: authToken });
    }

    static async getDisconnect(req, res) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await redisClient.del(`auth_${token}`);
        res.status(204).send();
    }
}

export default AuthController;
