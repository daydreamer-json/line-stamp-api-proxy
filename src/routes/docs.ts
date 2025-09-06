import { Hono } from 'hono';
import { loadConfig } from '../utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

app.get('/', (c) => c.redirect('https://github.com/daydreamer-json/line-stamp-api-proxy/blob/main/API.md', 301));

export default app;
