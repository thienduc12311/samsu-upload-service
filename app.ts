import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';
import morgan from 'morgan';
import config from './config';
import { configureRoutes } from './routes';
require('dotenv').config();
const app: Express = express();
const { port } = config;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const routes = configureRoutes(config);

app.use(morgan('combined'));

app.use('/', routes);

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
