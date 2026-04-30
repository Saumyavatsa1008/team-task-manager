import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import './config/firebase'; // initialize admin SDK at boot
import { logger } from './utils/logger';

import healthRouter from './routes/health';
import usersRouter from './routes/users';
import teamsRouter from './routes/teams';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import dashboardRouter from './routes/dashboard';
import meRouter from './routes/me';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()),
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  // Standard rate limit on writes; more permissive on the rest.
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', generalLimiter);

  // Mount routers under /api
  app.use('/api', healthRouter);
  app.use('/api', usersRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api', projectsRouter); // /teams/:teamId/projects + /projects/:projectId
  app.use('/api', tasksRouter); // /projects/:projectId/tasks + /tasks/:taskId
  app.use('/api', dashboardRouter);
  app.use('/api', meRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
