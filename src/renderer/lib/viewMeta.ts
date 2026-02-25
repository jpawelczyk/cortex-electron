import {
  Home, CalendarDays, FolderKanban, Inbox, CheckSquare, BookOpen,
  Video, FileText, Users, Trash2, Settings, Clock, Sparkles, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { SidebarView } from '../components/Sidebar';

export interface ViewMeta {
  label: string;
  icon: LucideIcon;
}

export const VIEW_META: Record<SidebarView, ViewMeta> = {
  home: { label: 'Home', icon: Home },
  daily: { label: 'Daily', icon: CalendarDays },
  inbox: { label: 'Inbox', icon: Inbox },
  tasks: { label: 'Tasks', icon: CheckSquare },
  today: { label: 'Today', icon: CheckSquare },
  upcoming: { label: 'Upcoming', icon: Clock },
  anytime: { label: 'Anytime', icon: Sparkles },
  someday: { label: 'Someday', icon: BookOpen },
  stale: { label: 'Stale', icon: AlertTriangle },
  logbook: { label: 'Logbook', icon: BookOpen },
  projects: { label: 'Projects', icon: FolderKanban },
  meetings: { label: 'Meetings', icon: Video },
  notes: { label: 'Notes', icon: FileText },
  stakeholders: { label: 'People', icon: Users },
  trash: { label: 'Trash', icon: Trash2 },
  settings: { label: 'Settings', icon: Settings },
};
