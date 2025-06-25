// controllers/FilesController.js
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fileQueue from '../workers/fileQueue';

const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

class FilesController {
    static async postUpload(req, res) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        if (!name) return res.status(400).json({ error: 'Missing name' });
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }
        if (type !== 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        if (parentId !== 0) {
            const parent = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
            if (!parent) return res.status(400).json({ error: 'Parent not found' });
            if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
        }

        const fileData = {
            userId: new ObjectId(userId),
            name,
            type,
            isPublic,
            parentId,
        };

        if (type === 'folder') {
            const insert = await dbClient.db.collection('files').insertOne(fileData);
            fileData.id = insert.insertedId;
            delete fileData._id;
            return res.status(201).json(fileData);
        }

        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        await fs.promises.mkdir(folderPath, { recursive: true });

        const filename = uuidv4();
        const localPath = `${folderPath}/${filename}`;
        await writeFile(localPath, Buffer.from(data, 'base64'));
        fileData.localPath = localPath;

        const insert = await dbClient.db.collection('files').insertOne(fileData);
        fileData.id = insert.insertedId;
        delete fileData._id;

        if (type === 'image') {
            fileQueue.add({ userId, fileId: fileData.id });
        }

        res.status(201).json(fileData);
    }

    static async getShow(req, res) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(userId) });
        if (!file) return res.status(404).json({ error: 'Not found' });

        const { _id, ...rest } = file;
        res.status(200).json({ id: _id, ...rest });
    }

    static async getIndex(req, res) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { parentId = 0, page = 0 } = req.query;
        const query = { userId: new ObjectId(userId) };
        if (parentId !== 0) query.parentId = parentId;

        const files = await dbClient.db
            .collection('files')
            .aggregate([
                { $match: query },
                { $skip: parseInt(page, 10) * 20 },
                { $limit: 20 },
            ])
            .toArray();

        const response = files.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
        res.status(200).json(response);
    }

    static async putPublish(req, res) {
        return FilesController.togglePublic(req, res, true);
    }

    static async putUnpublish(req, res) {
        return FilesController.togglePublic(req, res, false);
    }

    static async togglePublic(req, res, isPublic) {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(userId) });
        if (!file) return res.status(404).json({ error: 'Not found' });

        await dbClient.db.collection('files').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isPublic } });

        res.status(200).json({ id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic, parentId: file.parentId });
    }

    static async getFile(req, res) {
        const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(req.params.id) });
        if (!file) return res.status(404).json({ error: 'Not found' });

        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

        const size = req.query.size;
        let path = file.localPath;
        if (size) path += `_${size}`;

        try {
            await stat(path);
        } catch {
            return res.status(404).json({ error: 'Not found' });
        }

        const mimeType = mime.lookup(file.name);
        res.setHeader('Content-Type', mimeType);
        fs.createReadStream(path).pipe(res);
    }
}

export default FilesController;
