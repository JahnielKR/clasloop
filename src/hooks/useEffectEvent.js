// PR 143 (M9): userland polyfill for React's `useEffectEvent`.
//
// React's official `useEffectEvent` is experimental in 18.2 (this repo's
// version) and not exported from the stable package, so we ship the standard
// ref-based shim. Swap to the native import once the app moves to a React
// version that exports it.
//
// What it gives you: a STABLE function identity that always invokes the LATEST
// closure. Use it for the "event" part of an effect — logic that reads current
// props/state but must NOT make the effect re-subscribe/re-run when those
// values change. The returned function is exempt from `exhaustive-deps`, so the
// effect's dependency array can list only the values that should actually
// re-trigger it.
//
//   const onTick = useEffectEvent(() => doSomething(latestValue));
//   useEffect(() => { const id = setInterval(onTick, 1000); return () => clearInterval(id); }, []);
//
// The ref is updated in `useInsertionEffect` (runs before layout AND passive
// effects on every commit), so any effect that calls the event sees the latest
// closure. Do not call the returned function during render.

import { useInsertionEffect, useRef, useCallback } from 'react';

export function useEffectEvent(fn) {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
