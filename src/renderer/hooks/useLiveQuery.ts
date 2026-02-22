import { useState, useEffect, useCallback, useRef, type DependencyList } from 'react';

interface LiveQueryResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Reactive data fetching hook that auto-refetches when PowerSync detects
 * changes to the specified tables. Electron-compatible alternative to
 * @powersync/react's useQuery — communicates via IPC instead of direct DB access.
 *
 * @param queryFn  Async function that fetches data (typically via window.cortex.*)
 * @param tables   Table names to watch — refetches when any of these change
 * @param deps     Additional dependency list to trigger refetch
 */
export function useLiveQuery<T>(
  queryFn: () => Promise<T[]>,
  tables: string[],
  deps: DependencyList = [],
): LiveQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep queryFn in a ref so the execute callback is stable
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const execute = useCallback(async () => {
    try {
      const result = await queryFnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + refetch when deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute(); }, deps);

  // Subscribe to table change events with debounce
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = window.cortex.sync.onTablesUpdated((changedTables: string[]) => {
      const relevant = tablesRef.current.some((t) => changedTables.includes(t));
      if (!relevant) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        execute();
        debounceTimer = null;
      }, 50);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [execute]);

  return { data, isLoading, error };
}
