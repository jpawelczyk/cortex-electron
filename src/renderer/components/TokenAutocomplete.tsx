import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '../lib/utils';

interface TokenAutocompleteProps {
  items: { id: string; name: string; color?: string | null }[];
  query: string;
  onSelect: (item: { id: string; name: string }) => void;
  onDismiss: () => void;
  type: 'context' | 'project';
}

export function TokenAutocomplete({ items, query, onSelect, onDismiss, type }: TokenAutocompleteProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
    [items, query]
  );

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const listRef = useRef<HTMLUListElement>(null);

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const highlightedIndexRef = useRef(highlightedIndex);
  highlightedIndexRef.current = highlightedIndex;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredRef.current.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredRef.current[highlightedIndexRef.current]) {
          onSelectRef.current(filteredRef.current[highlightedIndexRef.current]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismissRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (filtered.length === 0) return null;

  const label = type === 'context' ? 'Contexts' : 'Projects';

  return (
    <div
      data-testid="token-autocomplete"
      className="absolute z-50 top-full left-[46px] mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ul ref={listRef} role="listbox">
        {filtered.map((item, index) => (
          <li
            key={item.id}
            role="option"
            aria-selected={index === highlightedIndex}
            className={cn(
              'px-3 py-1.5 text-[13px] cursor-pointer text-foreground flex items-center gap-2',
              index === highlightedIndex ? 'bg-accent/50' : 'hover:bg-accent/30'
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            onMouseEnter={() => setHighlightedIndex(index)}
          >
            {item.color && (
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
