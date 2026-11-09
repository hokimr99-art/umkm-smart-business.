import { useCallback, useEffect, useState } from 'react';
import { toUserMessage } from './errors';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Loads data with explicit loading / error / ready states and a reload function. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): [AsyncState<T>, () => void] {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const run = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    run()
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((err: unknown) => active && setState({ status: 'error', message: toUserMessage(err) }));
    return () => {
      active = false;
    };
  }, [run, tick]);

  return [state, () => setTick((t) => t + 1)];
}
