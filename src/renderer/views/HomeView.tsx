import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { CloudSun, CheckCircle2 } from 'lucide-react';
import { useStore } from '../stores';
import { useWeather } from '../hooks/useWeather';
import { TaskList } from '../components/TaskList';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function getSubtitle(todayCount: number, overdueCount: number): string {
  if (overdueCount > 0 && todayCount > 0) {
    return `${todayCount} tasks today, ${overdueCount} overdue. Let's catch up.`;
  }
  if (overdueCount > 0) {
    return `${overdueCount} overdue task${overdueCount === 1 ? '' : 's'}. Time to catch up.`;
  }
  if (todayCount === 0) {
    return 'Clear schedule ahead. Time to create.';
  }
  if (todayCount <= 3) {
    return `${todayCount} task${todayCount === 1 ? '' : 's'} on your plate today.`;
  }
  return `Busy day — ${todayCount} tasks lined up.`;
}

export function HomeView() {
  const now = useMemo(() => new Date(), []);
  const dayOfWeek = format(now, 'EEEE').toUpperCase();
  const monthDay = format(now, 'MMMM d').toUpperCase();
  const greeting = getGreeting();

  const firstName = useStore((s) => s.userFirstName);
  const weatherCity = useStore((s) => s.weatherCity);
  const tasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const weather = useWeather(weatherCity);

  const today = format(now, 'yyyy-MM-dd');

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;

  useEffect(() => {
    const timers = dismissTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const { todayCount, overdueCount, todayTasks } = useMemo(() => {
    let tc = 0;
    let oc = 0;
    const visible = [];
    for (const t of tasks) {
      if (t.deleted_at || t.status === 'logbook' || t.status === 'cancelled') continue;
      if (t.status === 'today' || t.when_date === today) {
        tc++;
        if (!dismissedIds.has(t.id)) visible.push(t);
      }
      if (t.deadline && t.deadline < today) oc++;
    }
    return { todayCount: tc, overdueCount: oc, todayTasks: visible };
  }, [tasks, today, dismissedIds]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIdsRef.current.has(id)) {
        updateTask(id, { status: 'today' });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        const existing = dismissTimers.current.get(id);
        if (existing) {
          clearTimeout(existing);
          dismissTimers.current.delete(id);
        }
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
        const timer = setTimeout(() => {
          setDismissedIds((prev) => new Set(prev).add(id));
          dismissTimers.current.delete(id);
        }, 2500);
        dismissTimers.current.set(id, timer);
      }
    },
    [updateTask],
  );

  const subtitle = getSubtitle(todayCount, overdueCount);
  const displayName = firstName || 'there';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Hero section */}
        <div
          className="relative rounded-xl border border-[oklch(1_0_0/6%)] overflow-hidden"
          style={{
            background: 'oklch(0.17 0.015 265 / 50%)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow:
              '0 0 40px oklch(0.78 0.15 195 / 6%), 0 0 80px oklch(0.65 0.20 295 / 4%), 0 1px 2px oklch(0 0 0 / 20%)',
          }}
        >
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(oklch(1 0 0 / 4%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 4%) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%)',
            }}
          />

          {/* Ambient gradient orbs */}
          <div
            className="absolute -top-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, oklch(0.78 0.15 195 / 10%) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, oklch(0.65 0.20 295 / 8%) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute top-0 right-1/4 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, oklch(0.78 0.15 195 / 5%) 0%, transparent 70%)',
            }}
          />

          {/* Top edge highlight */}
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 10%, oklch(1 0 0 / 8%) 50%, transparent 90%)',
            }}
          />

          <div className="relative flex items-center justify-between px-8 py-7">
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase">
                {dayOfWeek}, {monthDay}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {greeting},{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, oklch(0.72 0.2 280) 0%, oklch(0.78 0.18 230) 40%, oklch(0.80 0.15 195) 100%)',
                  }}
                >
                  {displayName}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground/80">{subtitle}</p>
            </div>

            {/* Weather widget */}
            {weather && (
              <div
                className="flex items-center gap-3 rounded-lg border border-[oklch(1_0_0/6%)] px-4 py-2.5"
                style={{
                  background: 'oklch(0.17 0.015 265 / 40%)',
                  backdropFilter: 'blur(12px) saturate(1.3)',
                  boxShadow:
                    'inset 0 1px 0 oklch(1 0 0 / 4%), 0 0 15px oklch(0.78 0.15 195 / 4%)',
                }}
              >
                <CloudSun className="size-5 text-primary/60" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {weather.temperature}°C
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {weather.description} · {weather.city}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Today's Tasks */}
        <div
          className="mt-6 rounded-xl border border-[oklch(1_0_0/6%)] overflow-hidden"
          style={{
            background: 'oklch(0.17 0.015 265 / 50%)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow: '0 1px 2px oklch(0 0 0 / 20%)',
          }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[oklch(1_0_0/6%)]">
            <h2 className="text-sm font-semibold text-foreground">Today&apos;s Tasks</h2>
            {todayCount > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground/60">{todayCount}</span>
            )}
          </div>

          <div className="px-3 py-2">
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <CheckCircle2 className="size-8 mb-2 opacity-20" strokeWidth={1.25} />
                <p className="text-sm">All clear for today</p>
              </div>
            ) : (
              <TaskList
                tasks={todayTasks}
                onCompleteTask={handleComplete}
                onSelectTask={selectTask}
                selectedTaskId={selectedTaskId}
                completedIds={completedIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
