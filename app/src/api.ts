export type OrderStatus = 'new' | 'in_progress' | 'done' | 'closed';
export type OrderPriority = 'low' | 'medium' | 'high';

export interface LiteratureItem {
  id: number;
  type: string;
  title: string;
  sortOrder: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: number;
  literatureId: number;
  quantity: number;
  price: number;
  literature: LiteratureItem;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  title: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  priority: OrderPriority;
  status: OrderStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: OrderLineItem[];
  totalAmount: number;
}

export interface OrderItemInput {
  literatureId: number;
  quantity: number;
}

export interface CreateOrderInput {
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  priority?: OrderPriority;
  createdBy: string;
  items?: OrderItemInput[];
}

export interface UpdateOrderInput {
  title?: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  priority?: OrderPriority;
  items?: OrderItemInput[];
}

export type FetchOrdersParams = Partial<{
  status: OrderStatus;
  createdBy: string;
}>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) {
        message = data.error;
      }
    } catch (error) {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchOrders(params: FetchOrdersParams = {}): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.createdBy) {
    query.set('createdBy', params.createdBy);
  }
  const queryString = query.toString();
  const path = `/orders${queryString ? `?${queryString}` : ''}`;
  return request<Order[]>(path);
}

export async function fetchOrder(id: number): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateOrder(id: number, input: UpdateOrderInput): Promise<Order> {
  return request<Order>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  return request<Order>(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteOrder(id: number): Promise<void> {
  await request<void>(`/orders/${id}`, { method: 'DELETE' });
}

export async function fetchLiterature(): Promise<LiteratureItem[]> {
  return request<LiteratureItem[]>('/literature');
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Завершён',
  closed: 'Закрыт',
};

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['in_progress', 'closed'],
  in_progress: ['done', 'closed'],
  done: ['closed'],
  closed: [],
};
