// controllers/UsersController.js
import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;
        if (!email) return res.status(400).json({ error: 'Missing email' });
        if (!password) return res.status(400).json({ error: 'Missing password' });

        const existing = await dbClient.db.collection('users').findOne({ email });
        if (existing) return res.status(400).json({ error: 'Already exist' });

        const newUser = await dbClient.db.collection('users').insertOne({
            email,
            password: sha1(password),
        });

        res.status(201).json({ id: newUser.insertedId, email });
    }

    static async getMe(req, res) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        res.status(200).json({ id: user._id, email: user.email });
    }
}

export default UsersController;
