import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import GroupDashboard from './components/GroupDashboard';
import LocalityDashboard from './components/LocalityDashboard';

type Role = 'group' | 'locality';

type RoleOption = {
  value: Role;
  label: string;
};

const ROLE_STORAGE_KEY = 'orders-app:role';
const GROUP_STORAGE_KEY = 'orders-app:group-name';

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'group', label: 'Группа' },
  { value: 'locality', label: 'Местность' },
];

const getStoredRole = (): Role => {
  if (typeof window === 'undefined') {
    return 'group';
  }
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
  return stored === 'group' || stored === 'locality' ? stored : 'group';
};

const getStoredGroupName = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(GROUP_STORAGE_KEY) ?? '';
};

function App() {
  const [role, setRole] = useState<Role>(() => getStoredRole());
  const [groupName, setGroupName] = useState(() => getStoredGroupName());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const trimmed = groupName.trim();
    if (trimmed.length > 0) {
      window.localStorage.setItem(GROUP_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(GROUP_STORAGE_KEY);
    }
  }, [groupName]);

  const activeRoleLabel = useMemo(() => {
    return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? '';
  }, [role]);

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as Role;
    if (value !== role) {
      setRole(value);
    }
  };

  const handleGroupNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGroupName(event.target.value);
  };

  const trimmedGroupName = useMemo(() => groupName.trim(), [groupName]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Демонстрационное приложение</p>
            <h1 className="text-2xl font-semibold text-slate-900">Панель управления заказами</h1>
            <p className="text-sm text-slate-500">
              Выберите активную роль. Для роли «Группа» укажите название, чтобы создавать заказы.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-end">
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Роль
              <select
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={role}
                onChange={handleRoleChange}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Название группы
              <input
                type="text"
                placeholder="Например, Отряд 7"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                value={groupName}
                onChange={handleGroupNameChange}
                disabled={role !== 'group'}
                aria-describedby="group-name-help"
              />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Сводка роли</h2>
              <p className="mt-1">
                Текущая роль: <span className="font-medium text-slate-900">{activeRoleLabel}</span>
              </p>
              {role === 'group' ? (
                <p className="mt-1">
                  Название вашей группы: <span className="font-medium text-slate-900">{trimmedGroupName || '—'}</span>
                </p>
              ) : (
                <p className="mt-1">
                  Роль «Местность» просматривает все заказы и управляет их статусами.
                </p>
              )}
            </div>
            <p id="group-name-help" className="text-sm text-slate-500">
              Выбор сохраняется локально и будет использоваться для фильтрации и действий на следующих шагах.
            </p>
          </div>
        </section>

        {role === 'group' ? (
          <GroupDashboard groupName={trimmedGroupName} />
        ) : (
          <LocalityDashboard />
        )}
      </main>
    </div>
  );
}

export default App;
