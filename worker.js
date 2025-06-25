import { createQueue } from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import { writeFile, mkdir } from 'fs';
import path from 'path';
import { promisify } from 'util';

const fileQueue = createQueue('fileQueue');
const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

fileQueue.process(async (job, done) => {
    const { fileId, userId } = job.data;

    if (!fileId || !userId) {
        done(new Error('Missing fileId or userId'));
        return;
    }

    const file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId });

    if (!file) {
        done(new Error('File not found'));
        return;
    }

    try {
        const filePath = file.localPath;
        const sizes = [500, 250, 100];

        await Promise.all(sizes.map(async (size) => {
            const thumbnail = await imageThumbnail(filePath, { width: size });
            const dir = path.dirname(filePath);
            const name = path.basename(filePath);

            const thumbPath = path.join(dir, `${name}_${size}`);
            await writeFileAsync(thumbPath, thumbnail);
        }));

        done();
    } catch (err) {
        console.error(err);
        done(err);
    }
});
