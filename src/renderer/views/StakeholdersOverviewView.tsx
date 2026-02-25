import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { useStore } from '../stores';
import { InlineStakeholderCard } from '../components/InlineStakeholderCard';
import type { Stakeholder } from '../../shared/types';

type StakeholderSort = 'name' | 'updated' | 'organization';

const StakeholderRow = React.memo(function StakeholderRow({ stakeholder, onClick }: { stakeholder: Stakeholder; onClick: () => void }) {
  const initials = stakeholder.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      data-testid="stakeholder-row"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/40 cursor-default transition-colors"
    >
      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{stakeholder.name}</span>
          {stakeholder.role && (
            <span className="text-xs text-muted-foreground truncate">{stakeholder.role}</span>
          )}
        </div>
        {stakeholder.organization && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{stakeholder.organization}</p>
        )}
      </div>
    </div>
  );
});

export function StakeholdersOverviewView() {
  const stakeholders = useStore(s => s.stakeholders);
  const fetchStakeholders = useStore(s => s.fetchStakeholders);
  const navigateTab = useStore(s => s.navigateTab);

  const isCreating = useStore(s => s.isInlineStakeholderCreating);
  const startInlineStakeholderCreate = useStore(s => s.startInlineStakeholderCreate);
  const cancelInlineStakeholderCreate = useStore(s => s.cancelInlineStakeholderCreate);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StakeholderSort>('name');

  useEffect(() => {
    fetchStakeholders();
  }, [fetchStakeholders]);

  const filteredStakeholders = useMemo(() => {
    let result = stakeholders.filter(s => !s.deleted_at);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.organization && s.organization.toLowerCase().includes(q))
      );
    }

    const sorted = [...result].sort((a, b) => {
      switch (sort) {
        case 'organization':
          return (a.organization ?? '').localeCompare(b.organization ?? '');
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [stakeholders, search, sort]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Stakeholders</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="text-xs bg-accent/50 text-foreground border-0 rounded-md pl-7 pr-2 py-1 outline-none w-40 placeholder:text-muted-foreground/50"
                data-testid="stakeholder-search"
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as StakeholderSort)}
              className="text-xs bg-accent/50 text-foreground border-0 rounded-md px-2 py-1 cursor-default outline-none"
              data-testid="stakeholder-sort"
            >
              <option value="name">Name A-Z</option>
              <option value="updated">Recently updated</option>
              <option value="organization">Organization</option>
            </select>
          </div>
        </div>

        {isCreating ? (
          <div className="mb-4">
            <InlineStakeholderCard onClose={cancelInlineStakeholderCreate} />
          </div>
        ) : (
          <button
            type="button"
            data-testid="new-stakeholder-trigger"
            onClick={startInlineStakeholderCreate}
            className="flex items-center gap-3 w-full px-4 py-3 mb-4 rounded-lg border border-dashed border-border/60 bg-card/20 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 hover:border-border transition-colors cursor-pointer"
          >
            <Plus className="size-4" strokeWidth={1.5} />
            <span className="text-[13px] font-medium">Add Stakeholder</span>
          </button>
        )}

        {filteredStakeholders.map(stakeholder => (
          <StakeholderRow
            key={stakeholder.id}
            stakeholder={stakeholder}
            onClick={() => navigateTab({ view: 'stakeholders', entityId: stakeholder.id, entityType: 'stakeholder' })}
          />
        ))}

        {filteredStakeholders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground" data-testid="stakeholders-empty">
            <Users className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No stakeholders yet. Add people you work with.</p>
          </div>
        )}
      </div>
    </div>
  );
}
