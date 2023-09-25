import 'dotenv/config';
import express, { Express } from 'express';
import nodeCleanup from 'node-cleanup';
import routes from './routes/index';
import * as whatsappService from './services/whatsappService';
import cors from 'cors';

const app: Express = express();

const host: string | undefined = process.env.APP_URL || undefined;
const port: number = parseInt(process.env.APP_PORT || '3000');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', routes);

const listenerCallback = function (): void {
  whatsappService.init();
  console.log(
    'Server is listening on http://' + (host ? host : 'localhost') + ':' + port
  );
};

if (host) {
  app.listen(port, host, listenerCallback);
} else {
  app.listen(port, listenerCallback);
}

nodeCleanup(whatsappService.cleanup);
