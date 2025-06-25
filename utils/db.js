import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        this.client = new MongoClient(`mongodb://${host}:${port}`, {
            useUnifiedTopology: true,
        });

        this.client.connect().then(() => {
            this.db = this.client.db(database);
        }).catch((error) => {
            console.log(error);
        });
    }

    isAlive() {
        return this.client.isConnected();
    }

    async nbUsers() {
        const users = this.db.collection('users');
        const usersCount = await users.countDocuments();
        return usersCount;
    }

    async nbFiles() {
        const files = this.db.collection('files');
        const filesCount = await files.countDocuments();
        return filesCount;
    }
}

const dbClient = new DBClient();
export default dbClient;