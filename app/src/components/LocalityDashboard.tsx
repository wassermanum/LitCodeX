import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchOrders,
  type Order,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_TRANSITIONS,
  updateOrderStatus,
} from '../api';

const formatRoubles = (valueInCents: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(valueInCents / 100);

const LocalityDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);
      if (data.length > 0) {
        setSelectedOrderId((current) => current ?? data[0].id);
      } else {
        setSelectedOrderId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  const handleStatusChange = async (order: Order, nextStatus: Order['status']) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось изменить статус');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Все заказы</h2>
            <p className="text-sm text-slate-500">Нажмите по строке, чтобы увидеть подробности и сменить статус.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              void loadOrders();
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Обновить
          </button>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Загрузка заказов...</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Заказы пока не созданы.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Название</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Группа</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Приоритет</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Статус</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Обновлён</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => {
                  const isActive = order.id === selectedOrderId;
                  return (
                    <tr
                      key={order.id}
                      className={`cursor-pointer transition hover:bg-slate-50 ${isActive ? 'bg-slate-100/80' : ''}`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{order.title}</div>
                        {order.description && (
                          <p className="mt-1 text-xs text-slate-500">{order.description}</p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">Сумма: {formatRoubles(order.totalAmount)}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{order.createdBy}</td>
                      <td className="px-4 py-2 text-slate-600">{ORDER_PRIORITY_LABELS[order.priority]}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {new Intl.DateTimeFormat('ru-RU', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(order.updatedAt))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Карточка заказа</h2>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
        {!selectedOrder ? (
          <p className="mt-4 text-sm text-slate-500">Выберите заказ, чтобы посмотреть подробности и изменить статус.</p>
        ) : (
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Название</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{selectedOrder.title}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Группа</p>
                <p className="mt-1 font-medium text-slate-900">{selectedOrder.createdBy}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Приоритет</p>
                <p className="mt-1 font-medium text-slate-900">{ORDER_PRIORITY_LABELS[selectedOrder.priority]}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Статус</p>
                <p className="mt-1 font-medium text-slate-900">{ORDER_STATUS_LABELS[selectedOrder.status]}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Количество</p>
                <p className="mt-1 font-medium text-slate-900">
                  {selectedOrder.quantity !== null ? (
                    <span>
                      {selectedOrder.quantity} {selectedOrder.unit ?? ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            {selectedOrder.description && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Описание</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{selectedOrder.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Общая стоимость</p>
              <p className="mt-1 font-semibold text-slate-900">{formatRoubles(selectedOrder.totalAmount)}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Создан</p>
                <p className="mt-1 text-slate-700">
                  {new Intl.DateTimeFormat('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(selectedOrder.createdAt))}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Обновлён</p>
                <p className="mt-1 text-slate-700">
                  {new Intl.DateTimeFormat('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(selectedOrder.updatedAt))}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Позиции заказа</p>
              <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                {selectedOrder.items.length === 0 ? (
                  <p className="text-xs text-slate-500">Позиции отсутствуют.</p>
                ) : (
                  selectedOrder.items.map((item) => (
                    <div key={item.id} className="text-xs text-slate-600">
                      <p className="font-medium text-slate-900">{item.literature.title}</p>
                      <p className="mt-1">
                        {item.quantity} шт × {formatRoubles(item.price)} ={' '}
                        <span className="font-semibold text-slate-900">{formatRoubles(item.lineTotal)}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Доступные действия</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATUS_TRANSITIONS[selectedOrder.status].length === 0 ? (
                  <span className="text-xs text-slate-500">Переходы недоступны.</span>
                ) : (
                  STATUS_TRANSITIONS[selectedOrder.status].map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      onClick={() => handleStatusChange(selectedOrder, nextStatus)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={isUpdating}
                    >
                      Перевести в «{ORDER_STATUS_LABELS[nextStatus]}»
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default LocalityDashboard;
