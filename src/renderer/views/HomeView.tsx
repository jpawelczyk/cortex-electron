import { useMemo } from 'react';
import { format } from 'date-fns';
import { CloudSun } from 'lucide-react';
import { useStore } from '../stores';
import { useWeather } from '../hooks/useWeather';

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
  const weather = useWeather(weatherCity);

  const today = format(now, 'yyyy-MM-dd');

  const { todayCount, overdueCount } = useMemo(() => {
    let tc = 0;
    let oc = 0;
    for (const t of tasks) {
      if (t.deleted_at || t.status === 'logbook' || t.status === 'cancelled') continue;
      if (t.status === 'today' || t.when_date === today) tc++;
      if (t.deadline && t.deadline < today) oc++;
    }
    return { todayCount: tc, overdueCount: oc };
  }, [tasks, today]);

  const subtitle = getSubtitle(todayCount, overdueCount);
  const displayName = firstName || 'there';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Hero section */}
        <div className="relative rounded-xl border border-border bg-card overflow-hidden">
          {/* Gradient glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/8 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between px-8 py-6">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium tracking-wider text-muted-foreground">
                {dayOfWeek}, {monthDay}
              </div>
              <h1 className="text-3xl font-bold">
                {greeting},{' '}
                <span className="bg-gradient-to-r from-[oklch(0.72_0.2_280)] via-[oklch(0.78_0.18_210)] to-[oklch(0.78_0.15_195)] bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>

            {/* Weather widget */}
            {weather && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                <CloudSun className="size-5 text-primary/70" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{weather.temperature}°C</span>
                  <span className="text-xs text-muted-foreground">
                    {weather.description} · {weather.city}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
