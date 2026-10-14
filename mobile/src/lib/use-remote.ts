import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ApiResult } from './api';

export type Remote<T> =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string };

/**
 * Loads an API call each time the screen gains focus while `enabled`, and on reload().
 * An answer that arrives after a newer request started is dropped.
 */
export function useRemote<T>(load: () => Promise<ApiResult<T>>, enabled: boolean) {
  const [remote, setRemote] = useState<Remote<T>>({ state: enabled ? 'loading' : 'idle' });
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    if (!enabled) {
      setRemote({ state: 'idle' });
      return;
    }
    setRemote((current) => (current.state === 'ready' ? current : { state: 'loading' }));
    const result = await load();
    if (mine !== generation.current) return;
    setRemote(result.ok ? { state: 'ready', data: result.data } : { state: 'error', message: result.message });
  }, [enabled, load]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { remote, reload };
}
