import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

const router = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.literature.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json(items);
  }),
);

export default router;
