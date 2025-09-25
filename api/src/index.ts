import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import ordersRouter from './routes/orders';
import literatureRouter from './routes/literature';
import { HttpError, isHttpError } from './errors';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT ?? '3000', 10);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/orders', ordersRouter);
app.use('/api/literature', literatureRouter);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, 'Not found'));
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(err)) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({ error: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server is running on http://localhost:${port}`);
});
