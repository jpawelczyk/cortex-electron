import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import { Circle, Calendar, Flag, Layers, Cloud, Plus, Hash, FolderOpen } from 'lucide-react';
import type { TaskStatus } from '@shared/types';
import { useStore } from '../stores';
import { DatePickerButton, type DatePickerAction } from './DatePickerButton';
import { parseTaskInput } from '../lib/parseTaskInput';
import { TokenAutocomplete } from './TokenAutocomplete';
import { cn } from '../lib/utils';

interface ActiveToken {
  type: 'context' | 'project';
  query: string;
  start: number;
  end: number;
}

/** Look backwards from cursorPos to find an active # or + token */
function getActiveToken(input: string, cursorPos: number): ActiveToken | null {
  const before = input.slice(0, cursorPos);

  // Find the last # or + that is at start or preceded by whitespace
  const match = before.match(/(?:^|\s)([#+])(\S*)$/);
  if (!match) return null;

  const trigger = match[1];
  const query = match[2];
  const tokenStart = before.lastIndexOf(trigger);

  return {
    type: trigger === '#' ? 'context' : 'project',
    query,
    start: tokenStart,
    end: cursorPos,
  };
}

export function InlineTaskCard() {
  const createTask = useStore((s) => s.createTask);
  const cancelInlineCreate = useStore((s) => s.cancelInlineCreate);
  const createChecklistItem = useStore((s) => s.createChecklistItem);
  const contexts = useStore((s) => s.contexts);
  const projects = useStore((s) => s.projects);
  const inlineCreateDefaults = useStore((s) => s.inlineCreateDefaults);
  const activeContextIds = useStore((s) => s.activeContextIds);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [whenDate, setWhenDate] = useState<string | null>(inlineCreateDefaults?.when_date ?? null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>(inlineCreateDefaults?.status ?? 'inbox');
  const [checklistItems, setChecklistItems] = useState<{ key: number; title: string }[]>([]);
  const [nextKey, setNextKey] = useState(0);
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  const notesRef = useRef(notes);
  const whenDateRef = useRef(whenDate);
  const deadlineRef = useRef(deadline);
  const statusRef = useRef(status);
  const checklistRef = useRef(checklistItems);
  const activeTokenRef = useRef(activeToken);

  titleRef.current = title;
  notesRef.current = notes;
  whenDateRef.current = whenDate;
  deadlineRef.current = deadline;
  statusRef.current = status;
  checklistRef.current = checklistItems;
  activeTokenRef.current = activeToken;

  const defaultProjectId = inlineCreateDefaults?.project_id ?? null;
  const defaultProjectIdRef = useRef(defaultProjectId);
  defaultProjectIdRef.current = defaultProjectId;

  const parsed = useMemo(
    () => parseTaskInput(title, contexts ?? [], projects ?? []),
    [title, contexts, projects]
  );

  const hasAnyParsedToken =
    parsed.raw.context !== undefined ||
    parsed.raw.project !== undefined ||
    parsed.raw.whenDate !== undefined ||
    parsed.raw.deadline !== undefined;

  const saveAndClose = useCallback(async () => {
    const trimmedRaw = titleRef.current.trim();
    if (!trimmedRaw) {
      cancelInlineCreate();
      return;
    }

    // Re-parse at save time using current state
    const parsedAtSave = parseTaskInput(trimmedRaw, contexts ?? [], projects ?? []);
    const trimmed = parsedAtSave.title.trim();

    if (!trimmed) {
      cancelInlineCreate();
      return;
    }

    const input: {
      title: string;
      notes?: string;
      when_date?: string;
      deadline?: string;
      status?: TaskStatus;
      project_id?: string;
      context_id?: string;
    } = { title: trimmed };

    if (notesRef.current.trim()) {
      input.notes = notesRef.current.trim();
    }

    // Token dates take priority; fall back to DatePickerButton values
    if (parsedAtSave.whenDate) {
      input.when_date = parsedAtSave.whenDate;
    } else if (whenDateRef.current) {
      input.when_date = whenDateRef.current;
    }

    if (parsedAtSave.deadline) {
      input.deadline = parsedAtSave.deadline;
    } else if (deadlineRef.current) {
      input.deadline = deadlineRef.current;
    }

    if (statusRef.current !== 'inbox') {
      input.status = statusRef.current;
    }

    // Token project overrides default
    if (parsedAtSave.projectId) {
      input.project_id = parsedAtSave.projectId;
    } else if (defaultProjectIdRef.current) {
      input.project_id = defaultProjectIdRef.current;
    }

    if (parsedAtSave.contextId) {
      input.context_id = parsedAtSave.contextId;
    } else if (activeContextIds.length === 1) {
      input.context_id = activeContextIds[0];
    }

    const task = await createTask(input);
    for (const item of checklistRef.current) {
      if (item.title.trim()) {
        await createChecklistItem({ task_id: task.id, title: item.title.trim() });
      }
    }

    cancelInlineCreate();
  }, [createTask, cancelInlineCreate, createChecklistItem, contexts, projects, activeContextIds]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTitle(newValue);

    // Detect active token at cursor position
    const cursor = e.target.selectionStart ?? newValue.length;
    const token = getActiveToken(newValue, cursor);

    // If the query is an exact match to a known item, dismiss the autocomplete —
    // the token is already resolved and the user can press Enter to submit.
    if (token) {
      const pool =
        token.type === 'context'
          ? (contexts ?? []).map((c) => c.name)
          : (projects ?? []).map((p) => p.title);
      const exactMatch = pool.some((name) => name.toLowerCase() === token.query.toLowerCase());
      setActiveToken(exactMatch ? null : token);
    } else {
      setActiveToken(null);
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // When autocomplete is open, Enter/Tab are handled by TokenAutocomplete's keydown listener
    if (activeTokenRef.current && (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape')) {
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    }
  };

  const handleAutocompleteSelect = (item: { id: string; name: string }) => {
    if (!activeToken) return;
    const trigger = activeToken.type === 'context' ? '#' : '+';
    const before = title.slice(0, activeToken.start);
    const after = title.slice(activeToken.end);
    const newTitle = `${before}${trigger}${item.name} ${after.trimStart()}`;
    setTitle(newTitle);
    setActiveToken(null);
    // Move cursor to end
    requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newTitle.length, newTitle.length);
      }
    });
  };

  const handleAutocompleteItemsForToken = () => {
    if (!activeToken) return [];
    if (activeToken.type === 'context') {
      return (contexts ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color }));
    }
    return (projects ?? []).map((p) => ({ id: p.id, name: p.title, color: null }));
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTokenRef.current) {
          // Dismiss autocomplete but don't cancel the card
          setActiveToken(null);
        } else {
          cancelInlineCreate();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cancelInlineCreate]);

  // Click-outside handler — save if title present, otherwise just dismiss
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // Don't dismiss when clicking inside a Radix popover portal
        if ((e.target as HTMLElement).closest?.('[data-radix-popper-content-wrapper]')) {
          return;
        }
        saveAndClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [saveAndClose]);

  const handleAddChecklistItem = () => {
    const key = nextKey;
    setNextKey((k) => k + 1);
    setChecklistItems((items) => [...items, { key, title: '' }]);
  };

  const handleChecklistChange = (key: number, value: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.key === key ? { ...item, title: value } : item))
    );
  };

  const handleChecklistKeyDown = (e: KeyboardEvent<HTMLInputElement>, key: number, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newKey = nextKey;
      setNextKey((k) => k + 1);
      setChecklistItems((items) => {
        const newItems = [...items];
        newItems.splice(index + 1, 0, { key: newKey, title: '' });
        return newItems;
      });
    }
    if (e.key === 'Backspace' && checklistItems[index]?.title === '') {
      e.preventDefault();
      setChecklistItems((items) => items.filter((i) => i.key !== key));
    }
  };

  const whenDateActions: DatePickerAction[] = [
    {
      label: 'Anytime',
      icon: <Layers className="size-3" />,
      onClick: () => setStatus('anytime'),
      active: status === 'anytime',
    },
    {
      label: 'Someday',
      icon: <Cloud className="size-3" />,
      onClick: () => setStatus('someday'),
      active: status === 'someday',
    },
  ];

  const whenIcon =
    status === 'anytime' ? <Layers className="size-3.5" /> :
    status === 'someday' ? <Cloud className="size-3.5" /> :
    <Calendar className="size-3.5" />;

  const autocompleteItems = handleAutocompleteItemsForToken();

  return (
    <div
      ref={cardRef}
      data-testid="inline-task-card"
      className="bg-card border border-border rounded-xl shadow-sm my-2 animate-card-enter"
    >
      <div className="relative">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="shrink-0">
            <Circle
              className="size-[18px] text-muted-foreground/50"
              strokeWidth={1.5}
            />
          </div>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="New task"
            className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
            autoFocus
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <DatePickerButton
              value={whenDate}
              onChange={setWhenDate}
              icon={whenIcon}
              label="When date"
              placeholder={status === 'anytime' ? 'Anytime' : status === 'someday' ? 'Someday' : undefined}
              actions={whenDateActions}
            />
            <DatePickerButton
              value={deadline}
              onChange={setDeadline}
              icon={<Flag className="size-3.5" />}
              label="Deadline"
            />
          </div>
        </div>

        {activeToken && (
          <TokenAutocomplete
            items={autocompleteItems}
            query={activeToken.query}
            type={activeToken.type}
            onSelect={handleAutocompleteSelect}
            onDismiss={() => setActiveToken(null)}
          />
        )}
      </div>

      {/* Preview chips for parsed tokens */}
      {hasAnyParsedToken && (
        <div className="flex flex-wrap gap-1.5 pb-1" style={{ paddingLeft: 46 }}>
          {parsed.raw.context !== undefined && (
            parsed.contextId ? (
              <span
                data-testid="chip-context"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-accent/50 text-foreground"
              >
                <Hash className="size-3" />
                {parsed.raw.context}
              </span>
            ) : (
              <span
                data-testid="chip-context-unmatched"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-destructive/10 text-destructive"
              >
                <Hash className="size-3" />
                {parsed.raw.context}?
              </span>
            )
          )}
          {parsed.raw.project !== undefined && (
            parsed.projectId ? (
              <span
                data-testid="chip-project"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-accent/50 text-foreground"
              >
                <FolderOpen className="size-3" />
                {parsed.raw.project}
              </span>
            ) : (
              <span
                data-testid="chip-project-unmatched"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-destructive/10 text-destructive"
              >
                <FolderOpen className="size-3" />
                {parsed.raw.project}?
              </span>
            )
          )}
          {parsed.raw.whenDate !== undefined && (
            <span
              data-testid="chip-when"
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs',
                parsed.whenDate
                  ? 'bg-accent/50 text-foreground'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              <Calendar className="size-3" />
              {parsed.whenDate ?? `${parsed.raw.whenDate}?`}
            </span>
          )}
          {parsed.raw.deadline !== undefined && (
            <span
              data-testid="chip-deadline"
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs',
                parsed.deadline
                  ? 'bg-accent/50 text-foreground'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              <Flag className="size-3" />
              {parsed.deadline ?? `${parsed.raw.deadline}?`}
            </span>
          )}
        </div>
      )}

      {/* Local checklist */}
      <div style={{ paddingLeft: 46 }} className="pr-4">
        {checklistItems.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 py-0.5">
            <Circle className="size-[14px] text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={item.title}
              onChange={(e) => handleChecklistChange(item.key, e.target.value)}
              onKeyDown={(e) => handleChecklistKeyDown(e, item.key, index)}
              placeholder="Checklist item"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none min-w-0"
              autoFocus
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddChecklistItem}
          className="flex items-center gap-2 py-1 text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
        >
          <Plus className="size-[14px]" />
          Add checklist item
        </button>
      </div>

      <div className="pr-4 pt-1 pb-3" style={{ paddingLeft: 46 }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={1}
          className="w-full bg-transparent text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
