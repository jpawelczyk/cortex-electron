import { useState, useMemo } from 'react';
import { Users, X, Search, Check } from 'lucide-react';
import { useStore } from '../stores';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface StakeholderPickerProps {
  selectedIds: string[];
  onLink: (stakeholderId: string) => void;
  onUnlink: (stakeholderId: string) => void;
}

export function StakeholderPicker({ selectedIds, onLink, onUnlink }: StakeholderPickerProps) {
  const stakeholders = useStore(s => s.stakeholders);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredStakeholders = useMemo(() => {
    const active = stakeholders.filter(s => !s.deleted_at);
    if (!search) return active;
    const q = search.toLowerCase();
    return active.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.organization && s.organization.toLowerCase().includes(q))
    );
  }, [stakeholders, search]);

  const selectedStakeholders = useMemo(
    () => stakeholders.filter(s => selectedIds.includes(s.id)),
    [stakeholders, selectedIds]
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {selectedStakeholders.map(s => (
        <span
          key={s.id}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/50 text-foreground"
        >
          {s.name}
          <button
            onClick={() => onUnlink(s.id)}
            className="p-0.5 rounded-full hover:bg-accent transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-all ${
              selectedIds.length > 0
                ? 'text-muted-foreground hover:bg-accent/50'
                : 'bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50'
            }`}
          >
            <Users className="size-3" />
            {selectedIds.length === 0 && 'Add stakeholder'}
            {selectedIds.length > 0 && '+'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <div className="px-2 pb-1">
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stakeholders..."
                className="w-full text-xs bg-transparent border-0 outline-none pl-6 pr-2 py-1.5 text-foreground placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredStakeholders.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-2">No stakeholders found</p>
            )}
            {filteredStakeholders.map(s => {
              const isSelected = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (isSelected) {
                      onUnlink(s.id);
                    } else {
                      onLink(s.id);
                    }
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  <span className="size-4 flex items-center justify-center">
                    {isSelected && <Check className="size-3 text-primary" />}
                  </span>
                  <span className="truncate">{s.name}</span>
                  {s.organization && (
                    <span className="text-xs text-muted-foreground truncate ml-auto">{s.organization}</span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
