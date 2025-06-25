// server.js
import express from 'express';
import router from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', router);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
