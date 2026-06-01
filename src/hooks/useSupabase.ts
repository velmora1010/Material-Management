import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSupabaseQuery<T>(
  table: string,
  queryFn?: (query: any) => any,
  deps: any[] = []
) {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select('*');
      if (queryFn) {
        query = queryFn(query);
      }
      const { data: result, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setData(result as T[]);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [table, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return { data, error, loading, refetch };
}
