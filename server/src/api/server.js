import express from 'express';
import cors from 'cors';
import config from '../utils/config.js';
import logger from '../utils/logger.js';
import submissionsRouter from './routes/submissions.js';
import languagesRouter from './routes/languages.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import snippetsRouter from './routes/snippets.js';
import codesRouter from './routes/codes.js';
import usersRouter from './routes/users.js';
import learningsRouter from './routes/learnings.js';
import requestLogger from './middleware/requestLogger.js';
import { initializeQueue, closeQueue } from '../queue/producer.js';
import { startWorker, stopWorker } from '../queue/worker.js';
import { connectDB, disconnectDB } from '../db/connection.js';

let serverInstance = null;

export async function startServer(port = config.port) {
  await connectDB();
  await initializeQueue();
  await startWorker();

  const app = express();
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (config.clientUrl === '*') return callback(null, true);

      const allowed = Array.isArray(config.clientUrl) ? config.clientUrl : [config.clientUrl];
      const normalizedOrigin = origin.replace(/\/+$/, '');
      const isAllowed = allowed.some((u) => u.replace(/\/+$/, '') === normalizedOrigin);

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowed }, 'CORS blocked request from origin');
        callback(null, false);
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  app.use('/health', healthRouter);
  app.use('/languages', languagesRouter);
  app.use('/submissions', submissionsRouter);
  app.use('/auth', authRouter);
  app.use('/snippets', snippetsRouter);
  app.use('/codes', codesRouter);
  app.use('/users', usersRouter);
  app.use('/learnings', learningsRouter);

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error({ err: err.message }, 'Unhandled error');
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      resolve(serverInstance);
    });
  });
}

export async function stopServer() {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await stopWorker();
  await closeQueue();
  await disconnectDB();
}

export default {
  startServer,
  stopServer,
};
