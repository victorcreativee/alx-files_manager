import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
    static async getConnect(req, res) {
        const authHeader = req.headers.authorization || '';
        const encoded = authHeader.split(' ')[1];

        if (!encoded) return res.status(401).json({ error: 'Unauthorized' });

        const buff = Buffer.from(encoded, 'base64');
        const decoded = buff.toString('utf-8');
        const [email, password] = decoded.split(':');

        if (!email || !password) return res.status(401).json({ error: 'Unauthorized' });

        const user = await dbClient.getUser({ email, password: sha1(password) });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const token = uuidv4();
        await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 3600);
        return res.status(200).json({ token });
    }

    static async getDisconnect(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await redisClient.del(`auth_${token}`);
        return res.status(204).send();
    }
}

export default AuthController;
