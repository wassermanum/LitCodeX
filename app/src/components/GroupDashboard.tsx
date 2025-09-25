import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createOrder,
  fetchLiterature,
  fetchOrders,
  type LiteratureItem,
  type Order,
  ORDER_STATUS_LABELS,
} from '../api';

const formatRoubles = (valueInCents: number) => {
  const amount = valueInCents / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(amount);
};

interface GroupDashboardProps {
  groupName: string;
}

interface SelectedItem {
  literature: LiteratureItem;
  quantity: number;
}

const INITIAL_TITLE = '';
const INITIAL_DESCRIPTION = '';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const sumQuantity = (items: Array<{ quantity: number }>) =>
  items.reduce((total, item) => total + item.quantity, 0);

const sumAmount = (items: Array<{ quantity: number; literature: LiteratureItem }>) =>
  items.reduce((total, item) => total + item.quantity * item.literature.price, 0);

const GroupDashboard = ({ groupName }: GroupDashboardProps) => {
  const [title, setTitle] = useState(INITIAL_TITLE);
  const [description, setDescription] = useState(INITIAL_DESCRIPTION);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [literature, setLiterature] = useState<LiteratureItem[]>([]);
  const [literatureLoading, setLiteratureLoading] = useState(false);
  const [literatureError, setLiteratureError] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({});
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const hasGroup = useMemo(() => groupName.trim().length > 0, [groupName]);

  const loadOrders = useCallback(async () => {
    if (!hasGroup) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await fetchOrders({ createdBy: groupName });
      setOrders(data);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Не удалось загрузить заказы');
    } finally {
      setOrdersLoading(false);
    }
  }, [groupName, hasGroup]);

  const loadLiterature = useCallback(async () => {
    setLiteratureLoading(true);
    setLiteratureError(null);
    try {
      const items = await fetchLiterature();
      setLiterature(items);
    } catch (error) {
      setLiteratureError(error instanceof Error ? error.message : 'Не удалось загрузить литературу');
    } finally {
      setLiteratureLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLiterature();
  }, [loadLiterature]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setSelectedItems([]);
    setQuantityInputs({});
    setSuccessMessage(null);
  }, [groupName]);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  const handleQuantityInputChange = (literatureId: number) => (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value.replace(/[^0-9]/g, '');
    setQuantityInputs((prev) => ({ ...prev, [literatureId]: value }));
  };

  const handleAddItem = (item: LiteratureItem) => {
    const rawValue = quantityInputs[item.id]?.trim() ?? '1';
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setFormError('Количество должно быть положительным целым числом.');
      setSuccessMessage(null);
      return;
    }

    setFormError(null);
    setSelectedItems((prev) => {
      const existing = prev.find((entry) => entry.literature.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.literature.id === item.id
            ? { ...entry, quantity: entry.quantity + parsed }
            : entry,
        );
      }
      return [...prev, { literature: item, quantity: parsed }];
    });
    setQuantityInputs((prev) => ({ ...prev, [item.id]: '' }));
    setSuccessMessage(`Добавлено «${item.title}» (${parsed} шт).`);
  };

  const handleIncrementSelected = (literatureId: number, delta: number) => {
    setSuccessMessage(null);
    setSelectedItems((prev) => {
      return prev
        .map((entry) =>
          entry.literature.id === literatureId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry,
        )
        .filter((entry) => entry.quantity > 0);
    });
  };

  const handleRemoveSelected = (literatureId: number) => {
    setSuccessMessage(null);
    setSelectedItems((prev) => prev.filter((entry) => entry.literature.id !== literatureId));
  };

  const resetForm = () => {
    setTitle(INITIAL_TITLE);
    setDescription(INITIAL_DESCRIPTION);
    setSelectedItems([]);
    setQuantityInputs({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedGroup = groupName.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedGroup) {
      setFormError('Введите название группы, чтобы создать заказ.');
      return;
    }

    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      setFormError('Название заказа должно содержать от 1 до 100 символов.');
      return;
    }

    if (selectedItems.length === 0) {
      setFormError('Добавьте хотя бы одну позицию из каталога, чтобы создать заказ.');
      return;
    }

    const totalQuantity = sumQuantity(selectedItems);
    const totalAmount = sumAmount(selectedItems);

    const payload: Parameters<typeof createOrder>[0] = {
      title: trimmedTitle,
      createdBy: trimmedGroup,
      unit: 'шт',
      quantity: totalQuantity,
      items: selectedItems.map((entry) => ({
        literatureId: entry.literature.id,
        quantity: entry.quantity,
      })),
    };

    if (trimmedDescription) {
      payload.description = trimmedDescription;
    }

    setIsSubmitting(true);
    try {
      await createOrder(payload);
      resetForm();
      setSuccessMessage(`Заказ успешно создан на сумму ${formatRoubles(totalAmount)}.`);
      await loadOrders();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось создать заказ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTotalQuantity = useMemo(
    () => sumQuantity(selectedItems),
    [selectedItems],
  );

  const selectedTotalAmount = useMemo(() => sumAmount(selectedItems), [selectedItems]);

  const isSubmitDisabled = !hasGroup || isSubmitting || selectedItems.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 max-w-4xl">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Создание заказа</h2>
          <p className="mt-1 text-sm text-slate-500">
            Введите название, при необходимости описание и добавьте позиции из каталога ниже.
          </p>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Название заказа*
              <input
                type="text"
                className="rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={title}
                onChange={handleTitleChange}
                maxLength={100}
                required
                placeholder="Например, Комплект литературы для новичков"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Описание
              <textarea
                className="min-h-[96px] rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={description}
                onChange={handleDescriptionChange}
                maxLength={2000}
                placeholder="Дополнительные детали для местности"
              />
            </label>

            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600" role="status">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? 'Сохраняем...' : 'Создать заказ'}
            </button>
            {!hasGroup && (
              <p className="text-sm text-slate-500">
                Укажите название группы в шапке, чтобы активировать создание заказов.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Мои заказы</h2>
              <p className="text-sm text-slate-500">
                Краткий список последних заказов группы «{groupName || '—'}».
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                void loadOrders();
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed"
              disabled={ordersLoading || !hasGroup}
            >
              Обновить
            </button>
          </div>

          {!hasGroup ? (
            <p className="mt-4 text-sm text-slate-500">
              Заполните поле «Название группы» в шапке, чтобы увидеть список заказов.
            </p>
          ) : ordersLoading ? (
            <p className="mt-4 text-sm text-slate-500">Загрузка заказов...</p>
          ) : ordersError ? (
            <p className="mt-4 text-sm text-red-600">{ordersError}</p>
          ) : orders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Пока что вы не создавали заказов.</p>
          ) : (
            <div className="mt-4 space-y-3 overflow-hidden">
            <div className="space-y-3 overflow-y-auto pr-1 max-h-72">
                {orders.map((order) => {
                  const totalItems = sumQuantity(order.items);
                  return (
                    <article
                      key={order.id}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{order.title}</p>
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      {order.description && (
                        <p className="mt-1 text-xs text-slate-500">{order.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>Позиции: {totalItems > 0 ? `${totalItems} шт` : '—'}</span>
                        <span>Сумма: {formatRoubles(order.totalAmount)}</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                Совет: используйте роль «Местность», чтобы отслеживать смену статуса по созданным заявкам.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Каталог литературы</h2>
              <p className="text-sm text-slate-500">
                Выберите позиции, задайте количество и добавьте их в текущий заказ. Все количества учитываются в штуках.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed"
              onClick={() => void loadLiterature()}
              disabled={literatureLoading}
            >
              Обновить
            </button>
          </div>

          {literatureLoading ? (
            <p className="mt-4 text-sm text-slate-500">Загрузка каталога...</p>
          ) : literatureError ? (
            <p className="mt-4 text-sm text-red-600">{literatureError}</p>
          ) : literature.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Каталог литературы пуст. Попробуйте обновить позже.</p>
          ) : (
            <div className="mt-4 max-h-[520px] overflow-y-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Тип</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Название</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Количество</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {literature.map((item) => {
                    const inputValue = quantityInputs[item.id] ?? '';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">{item.type}</td>
                        <td className="px-3 py-2 text-slate-900">
                          <span className="font-medium">{item.title}</span>
                          <span className="ml-2 text-xs text-slate-500">{formatRoubles(item.price)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            value={inputValue}
                            onChange={handleQuantityInputChange(item.id)}
                            placeholder="1"
                            disabled={!hasGroup}
                            aria-label={`Количество для ${item.title}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                            onClick={() => handleAddItem(item)}
                            disabled={!hasGroup}
                          >
                            Добавить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Текущий заказ</h2>
              <p className="text-sm text-slate-500">
                Корректируйте позиции кнопками «+» и «−», чтобы настроить финальное количество.
              </p>
            </div>
            <div className="flex flex-col items-end text-xs text-slate-600">
              <span>Позиции: {selectedTotalQuantity} шт</span>
              <span className="font-semibold text-slate-900">Итого: {formatRoubles(selectedTotalAmount)}</span>
            </div>
          </div>

          {selectedItems.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Позиции ещё не добавлены. Выберите литературу из списка слева.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {selectedItems.map((entry) => {
                const lineTotal = entry.quantity * entry.literature.price;
                return (
                  <li
                    key={entry.literature.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{entry.literature.type}</p>
                      <p className="mt-1 font-medium text-слав-900">{entry.literature.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.quantity} шт × {formatRoubles(entry.literature.price)} ={' '}
                        <span className="font-medium text-slate-900">{formatRoubles(lineTotal)}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-base font-semibold text-slate-700 transition hover:border-слав-400"
                          onClick={() => handleIncrementSelected(entry.literature.id, -1)}
                          aria-label={`Убавить количество для ${entry.literature.title}`}
                        >
                          −
                        </button>
                        <span className="min-w-[2.5rem] text-center text-sm font-semibold text-слав-900">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-слав-300 text-base font-semibold text-слав-700 transition hover:border-слав-400"
                          onClick={() => handleIncrementSelected(entry.literature.id, 1)}
                          aria-label={`Добавить ещё для ${entry.literature.title}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveSelected(entry.literature.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default GroupDashboard;
