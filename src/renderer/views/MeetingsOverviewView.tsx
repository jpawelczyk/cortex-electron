import React, { useState, useMemo, useEffect } from 'react';
import { Video, Plus, Search } from 'lucide-react';
import { parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { useStore } from '../stores';
import { InlineMeetingCard } from '../components/InlineMeetingCard';
import type { Meeting, Context } from '../../shared/types';

type MeetingSort = 'date' | 'updated' | 'title';

function formatMeetingTime(meeting: Meeting): string {
  if (meeting.is_all_day) return 'All day';
  const start = parseISO(meeting.start_time);
  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (meeting.end_time) {
    const end = parseISO(meeting.end_time);
    const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${timeStr} – ${endStr}`;
  }
  return timeStr;
}

function formatMeetingDate(iso: string): string {
  const date = parseISO(iso);
  const now = new Date();
  const today = startOfDay(now);
  const meetingDay = startOfDay(date);

  if (meetingDay.getTime() === today.getTime()) return 'Today';

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (meetingDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (meetingDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const MeetingRow = React.memo(function MeetingRow({ meeting, onClick, contexts }: { meeting: Meeting; onClick: () => void; contexts: Context[] }) {
  const ctx = meeting.context_id ? contexts.find(c => c.id === meeting.context_id) : null;

  return (
    <div
      data-testid="meeting-row"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/40 cursor-default transition-colors"
    >
      <Video className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{meeting.title}</span>
          {meeting.status !== 'scheduled' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              meeting.status === 'completed' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'
            }`}>
              {meeting.status}
            </span>
          )}
          {ctx && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-accent/50 text-muted-foreground shrink-0">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: ctx.color ?? undefined }} />
              {ctx.name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatMeetingDate(meeting.start_time)} · {formatMeetingTime(meeting)}
        </p>
      </div>
    </div>
  );
});

export function MeetingsOverviewView() {
  const meetings = useStore(s => s.meetings);
  const contexts = useStore(s => s.contexts) as Context[];
  const activeContextIds = useStore(s => s.activeContextIds);
  const fetchMeetings = useStore(s => s.fetchMeetings);
  const navigateTab = useStore(s => s.navigateTab);
  const isInlineMeetingCreating = useStore(s => s.isInlineMeetingCreating);
  const startInlineMeetingCreate = useStore(s => s.startInlineMeetingCreate);
  const cancelInlineMeetingCreate = useStore(s => s.cancelInlineMeetingCreate);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MeetingSort>('date');

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filteredMeetings = useMemo(() => {
    let result = meetings.filter(m => !m.deleted_at);

    // Context filter
    if (activeContextIds.length > 0) {
      result = result.filter(m => m.context_id !== null && activeContextIds.includes(m.context_id));
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [meetings, activeContextIds, search]);

  const { todayMeetings, upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    const sorted = [...filteredMeetings].sort((a, b) => {
      switch (sort) {
        case 'title': return a.title.localeCompare(b.title);
        case 'updated': return parseISO(b.updated_at).getTime() - parseISO(a.updated_at).getTime();
        default: return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
      }
    });

    const todayMeetings: Meeting[] = [];
    const upcomingMeetings: Meeting[] = [];
    const pastMeetings: Meeting[] = [];

    for (const m of sorted) {
      const startDate = parseISO(m.start_time);
      if (isToday(startDate)) {
        todayMeetings.push(m);
      } else if (isBefore(startDate, todayStart)) {
        pastMeetings.push(m);
      } else {
        upcomingMeetings.push(m);
      }
    }

    // Past should be most recent first
    if (sort === 'date') {
      pastMeetings.reverse();
    }

    return { todayMeetings, upcomingMeetings, pastMeetings };
  }, [filteredMeetings, sort]);

  const isEmpty = todayMeetings.length === 0 && upcomingMeetings.length === 0 && pastMeetings.length === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Meetings</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="text-xs bg-accent/50 text-foreground border-0 rounded-md pl-7 pr-2 py-1 outline-none w-40 placeholder:text-muted-foreground/50"
                data-testid="meeting-search"
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as MeetingSort)}
              className="text-xs bg-accent/50 text-foreground border-0 rounded-md px-2 py-1 cursor-default outline-none"
              data-testid="meeting-sort"
            >
              <option value="date">Date</option>
              <option value="updated">Recently updated</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>

        {isInlineMeetingCreating ? (
          <div className="mb-4">
            <InlineMeetingCard onClose={cancelInlineMeetingCreate} />
          </div>
        ) : (
          <button
            type="button"
            data-testid="new-meeting-trigger"
            onClick={startInlineMeetingCreate}
            className="flex items-center gap-3 w-full px-4 py-3 mb-4 rounded-lg border border-dashed border-border/60 bg-card/20 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 hover:border-border transition-colors cursor-pointer"
          >
            <Plus className="size-4" strokeWidth={1.5} />
            <span className="text-[13px] font-medium">Add Meeting</span>
          </button>
        )}

        {/* Today */}
        {todayMeetings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Today</h3>
            {todayMeetings.map(m => (
              <MeetingRow key={m.id} meeting={m} onClick={() => navigateTab({ view: 'meetings', entityId: m.id, entityType: 'meeting' })} contexts={contexts} />
            ))}
          </div>
        )}

        {/* Upcoming */}
        {upcomingMeetings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Upcoming</h3>
            {upcomingMeetings.map(m => (
              <MeetingRow key={m.id} meeting={m} onClick={() => navigateTab({ view: 'meetings', entityId: m.id, entityType: 'meeting' })} contexts={contexts} />
            ))}
          </div>
        )}

        {/* Past */}
        {pastMeetings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Past</h3>
            {pastMeetings.map(m => (
              <MeetingRow key={m.id} meeting={m} onClick={() => navigateTab({ view: 'meetings', entityId: m.id, entityType: 'meeting' })} contexts={contexts} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !isInlineMeetingCreating && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground" data-testid="meetings-empty">
            <Video className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No meetings scheduled. Plan your next meeting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
