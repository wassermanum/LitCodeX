import { Router, Request, Response, NextFunction } from 'express';
import { Priority, Prisma, Status } from '@prisma/client';
import prisma from '../prisma';
import { HttpError } from '../errors';

const router = Router();

const orderWithItemsInclude = {
  items: {
    include: {
      literature: true,
    },
    orderBy: {
      literature: {
        sortOrder: 'asc',
      },
    },
  },
} satisfies Prisma.OrderInclude;

const LITERATURE_SELECT = {
  id: true,
  price: true,
} satisfies Prisma.LiteratureSelect;

type OrderItemDto = OrderWithItems['items'][number] & { lineTotal: number };
type OrderDto = Omit<OrderWithItems, 'items'> & { items: OrderItemDto[]; totalAmount: number };

const serializeOrder = (order: OrderWithItems): OrderDto => {
  const items = order.items.map((item) => ({
    ...item,
    lineTotal: item.price * item.quantity,
  }));

  const totalAmount = items.reduce((acc, item) => acc + item.lineTotal, 0);

  return {
    ...order,
    items,
    totalAmount,
  };
};

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof orderWithItemsInclude;
}>;

type OrderItemInput = {
  literatureId: number;
  quantity: number;
};

const parseOrderItems = (value: unknown): OrderItemInput[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, 'items must be an array');
  }

  const items = value.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new HttpError(400, `items[${index}] must be an object`);
    }

    const literatureId = Number((raw as Record<string, unknown>).literatureId);
    const quantity = Number((raw as Record<string, unknown>).quantity);

    if (!Number.isInteger(literatureId) || literatureId <= 0) {
      throw new HttpError(400, `items[${index}].literatureId must be a positive integer`);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, `items[${index}].quantity must be a positive integer`);
    }

    return {
      literatureId,
      quantity,
    } satisfies OrderItemInput;
  });

  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.literatureId)) {
      throw new HttpError(400, 'Duplicate literatureId in items payload');
    }
    seen.add(item.literatureId);
  }

  return items;
};

const ensureOrderItemsLiteratureExists = async (
  tx: Prisma.TransactionClient,
  items: OrderItemInput[],
): Promise<Map<number, number>> => {
  if (items.length === 0) {
    return new Map();
  }

  const ids = items.map((item) => item.literatureId);
  const literature = await tx.literature.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: LITERATURE_SELECT,
  });

  if (literature.length !== ids.length) {
    throw new HttpError(400, 'One or more literature items were not found');
  }

  return new Map(literature.map((item) => [item.id, item.price] as const));
};

const PRIORITY_VALUES = new Set<Priority>(Object.values(Priority));
const STATUS_VALUES = new Set<Status>(Object.values(Status));

const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  new: ['in_progress', 'closed'],
  in_progress: ['done', 'closed'],
  done: ['closed'],
  closed: [],
};

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};

const parseId = (value: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid order id');
  }
  return id;
};

const normalizeText = (value: unknown, field: string, min = 1, max = 100): string => {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max} characters`);
  }
  return trimmed;
};

const optionalText = (value: unknown, field: string, max = 255): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }
  return trimmed;
};

const optionalInt = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number') {
    throw new HttpError(400, `${field} must be a number`);
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `${field} must be a non-negative integer`);
  }
  return value;
};

const parsePriority = (value: unknown, required: boolean): Priority | undefined => {
  if (value === undefined) {
    if (required) {
      throw new HttpError(400, 'priority is required');
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'priority must be a string');
  }
  if (!PRIORITY_VALUES.has(value as Priority)) {
    throw new HttpError(400, 'priority must be one of: low, medium, high');
  }
  return value as Priority;
};

const parseStatus = (value: unknown): Status => {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'status must be a string');
  }
  if (!STATUS_VALUES.has(value as Status)) {
    throw new HttpError(400, 'status must be one of: new, in_progress, done, closed');
  }
  return value as Status;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, createdBy } = req.query;

    const where: Prisma.OrderWhereInput = {};

    if (status !== undefined) {
      if (Array.isArray(status)) {
        throw new HttpError(400, 'status must be a single value');
      }
      where.status = parseStatus(status);
    }

    if (createdBy !== undefined) {
      if (Array.isArray(createdBy)) {
        throw new HttpError(400, 'createdBy must be a single value');
      }
      where.createdBy = normalizeText(createdBy, 'createdBy');
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: orderWithItemsInclude,
    });

    res.json(orders.map(serializeOrder));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderWithItemsInclude,
    });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    res.json(serializeOrder(order));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description, quantity, unit, priority, createdBy, items } = req.body ?? {};

    const parsedTitle = normalizeText(title, 'title');
    const parsedCreatedBy = normalizeText(createdBy, 'createdBy');
    const parsedDescription = optionalText(description, 'description', 2000);
    const parsedUnit = optionalText(unit, 'unit', 50);
    const parsedQuantity = optionalInt(quantity, 'quantity');
    const parsedPriority = parsePriority(priority, false);
    const parsedItems = parseOrderItems(items);

    const data: Prisma.OrderCreateInput = {
      title: parsedTitle,
      createdBy: parsedCreatedBy,
    };

    if (parsedDescription !== undefined) {
      data.description = parsedDescription;
    }
    if (parsedUnit !== undefined) {
      data.unit = parsedUnit;
    }
    if (parsedQuantity !== undefined) {
      data.quantity = parsedQuantity;
    }
    if (parsedPriority !== undefined) {
      data.priority = parsedPriority;
    }

    const order = await prisma.$transaction(async (tx) => {
      const literatureMap = await ensureOrderItemsLiteratureExists(tx, parsedItems);

      if (parsedItems.length > 0) {
        data.items = {
          create: parsedItems.map((item) => {
            const price = literatureMap.get(item.literatureId);
            if (price === undefined) {
              throw new HttpError(400, 'One or more literature items were not found');
            }

            return {
              quantity: item.quantity,
              price,
              literature: {
                connect: { id: item.literatureId },
              },
            };
          }),
        };
      }

      return tx.order.create({
        data,
        include: orderWithItemsInclude,
      });
    });

    res.status(201).json(serializeOrder(order));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { title, description, quantity, unit, priority } = req.body ?? {};

    const data: Prisma.OrderUpdateInput = {};
    let hasChanges = false;

    if (title !== undefined) {
      data.title = normalizeText(title, 'title');
      hasChanges = true;
    }

    if (description !== undefined) {
      const desc = optionalText(description, 'description', 2000);
      data.description = desc ?? null;
      hasChanges = true;
    }

    if (unit !== undefined) {
      const parsedUnit = optionalText(unit, 'unit', 50);
      data.unit = parsedUnit ?? null;
      hasChanges = true;
    }

    if (quantity !== undefined) {
      const parsedQuantity = optionalInt(quantity, 'quantity');
      data.quantity = parsedQuantity ?? null;
      hasChanges = true;
    }

    if (priority !== undefined) {
      data.priority = parsePriority(priority, false);
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new HttpError(400, 'No valid fields provided for update');
    }

    let order;
    try {
      order = await prisma.order.update({
        where: { id },
        data,
        include: orderWithItemsInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(404, 'Order not found');
      }
      throw error;
    }

    res.json(serializeOrder(order));
  })
);

router.put(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const nextStatus = parseStatus(req.body?.status);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    const allowedTargets = STATUS_TRANSITIONS[order.status];
    if (!allowedTargets.includes(nextStatus)) {
      throw new HttpError(
        400,
        `Cannot transition status from ${order.status} to ${nextStatus}`
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: orderWithItemsInclude,
    });

    res.json(serializeOrder(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    try {
      await prisma.order.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(404, 'Order not found');
      }
      throw error;
    }

    res.status(204).send();
  })
);

export default router;
