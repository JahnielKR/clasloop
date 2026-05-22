import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffectEvent } from '../useEffectEvent';

describe('useEffectEvent', () => {
  it('keeps a stable function identity across re-renders', () => {
    const { result, rerender } = renderHook(({ n }) => useEffectEvent(() => n), {
      initialProps: { n: 1 },
    });
    const first = result.current;
    rerender({ n: 2 });
    rerender({ n: 3 });
    expect(result.current).toBe(first);
  });

  it('always invokes the latest closure, not a stale one', () => {
    const { result, rerender } = renderHook(({ n }) => useEffectEvent(() => n), {
      initialProps: { n: 1 },
    });
    expect(result.current()).toBe(1);
    rerender({ n: 42 });
    expect(result.current()).toBe(42);
  });

  it('forwards arguments to the current callback', () => {
    const { result, rerender } = renderHook(
      ({ factor }) => useEffectEvent((x) => x * factor),
      { initialProps: { factor: 2 } }
    );
    expect(result.current(5)).toBe(10);
    rerender({ factor: 3 });
    expect(result.current(5)).toBe(15);
  });
});
