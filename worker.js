// worker.js
import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import fileQueue from './workers/fileQueue';
import dbClient from './utils/db';

fileQueue.process(async (job) => {
    const { fileId, userId } = job.data;
    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
    });

    if (!file) throw new Error('File not found');
    const sizes = [500, 250, 100];

    await Promise.all(
        sizes.map(async (size) => {
            const thumbnail = await imageThumbnail(file.localPath, { width: size });
            await fs.promises.writeFile(`${file.localPath}_${size}`, thumbnail);
        })
    );
});
