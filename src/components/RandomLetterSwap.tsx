import { useMemo, type CSSProperties } from 'react';

export default function RandomLetterSwap({
  label,
  seed = 0,
  swapping = false,
}: {
  label: string;
  seed?: number;
  swapping?: boolean;
}) {
  const chars = useMemo(() => Array.from(label), [label]);

  const delays = useMemo(() => {
    const indices = chars.map((_, index) => index);
    let state = (seed * 2654435761 + label.length * 1013904223) >>> 0;
    for (let i = indices.length - 1; i > 0; i--) {
      state = (Math.imul(state ^ (state >>> 13), 1597334677) + 1013904223) >>> 0;
      const j = state % (i + 1);
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }
    return indices.map((order) => order * 28);
  }, [chars, label.length, seed]);

  return (
    <span className="letter-swap-wrap">
      <span className="sr-only">{label}</span>
      <span
        className="letter-swap"
        aria-hidden="true"
        data-swapping={swapping ? 'true' : undefined}
      >
        {chars.map((char, index) => (
          <span
            key={index}
            className="letter-swap__slot"
            style={{ '--swap-delay': `${delays[index]}ms` } as CSSProperties}
          >
            <span className="letter-swap__primary">{char === ' ' ? '\u00A0' : char}</span>
            <span className="letter-swap__secondary">{char === ' ' ? '\u00A0' : char}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
