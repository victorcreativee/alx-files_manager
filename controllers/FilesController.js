// controllers/FilesController.js
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
    static async postUpload(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await dbClient.getUser({ _id: userId });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const {
            name, type, parentId = 0, isPublic = false, data,
        } = req.body;

        if (!name) return res.status(400).json({ error: 'Missing name' });
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }
        if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

        if (parentId !== 0) {
            const parent = await dbClient.getFile({ _id: parentId });
            if (!parent) return res.status(400).json({ error: 'Parent not found' });
            if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
        }

        if (type === 'folder') {
            const newFolder = await dbClient.createFile({
                userId,
                name,
                type,
                isPublic,
                parentId,
            });
            return res.status(201).json({
                id: newFolder._id,
                userId: newFolder.userId,
                name: newFolder.name,
                type: newFolder.type,
                isPublic: newFolder.isPublic,
                parentId: newFolder.parentId,
            });
        }

        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        await fs.promises.mkdir(folderPath, { recursive: true });
        const filePath = `${folderPath}/${uuidv4()}`;
        await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));

        const newFile = await dbClient.createFile({
            userId,
            name,
            type,
            isPublic,
            parentId,
            localPath: filePath,
        });

        return res.status(201).json({
            id: newFile._id,
            userId: newFile.userId,
            name: newFile.name,
            type: newFile.type,
            isPublic: newFile.isPublic,
            parentId: newFile.parentId,
        });
    }

    static async getShow(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = await dbClient.getFile({ _id: req.params.id, userId });
        if (!file) return res.status(404).json({ error: 'Not found' });

        return res.status(200).json(file);
    }

    static async getIndex(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const parentId = req.query.parentId || 0;
        const page = parseInt(req.query.page || '0', 10);

        const files = await dbClient.listFiles({ userId, parentId }, page);
        return res.status(200).json(files);
    }

    static async putPublish(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = await dbClient.updateFilePublish(req.params.id, userId, true);
        if (!file) return res.status(404).json({ error: 'Not found' });

        return res.status(200).json(file);
    }

    static async putUnpublish(req, res) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = await dbClient.updateFilePublish(req.params.id, userId, false);
        if (!file) return res.status(404).json({ error: 'Not found' });

        return res.status(200).json(file);
    }

    static async getFile(req, res) {
        const file = await dbClient.getFile({ _id: req.params.id });
        if (!file) return res.status(404).json({ error: 'Not found' });

        if (!file.isPublic && (!req.headers['x-token']
            || await redisClient.get(`auth_${req.headers['x-token']}`) !== file.userId.toString())) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (file.type === 'folder') return res.status(400).json({ error: 'A folder doesn\'t have content' });

        try {
            const fileData = await fs.promises.readFile(file.localPath);
            const mimeType = mime.lookup(file.name);
            res.setHeader('Content-Type', mimeType || 'application/octet-stream');
            return res.status(200).send(fileData);
        } catch (err) {
            return res.status(404).json({ error: 'Not found' });
        }
    }
}

export default FilesController;
