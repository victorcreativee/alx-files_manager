// controllers/UsersController.js
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body || {};

        if (!email) return res.status(400).json({ error: 'Missing email' });
        if (!password) return res.status(400).json({ error: 'Missing password' });

        const existingUser = await dbClient.getUser({ email });
        if (existingUser) return res.status(400).json({ error: 'Already exist' });

        const hashedPassword = sha1(password);
        const newUser = await dbClient.createUser({ email, password: hashedPassword });

        return res.status(201).json({ id: newUser._id, email: newUser.email });
    }

    static async getMe(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await dbClient.getUser({ _id: userId });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        return res.status(200).json({ id: user._id, email: user.email });
    }
}

export default UsersController;
