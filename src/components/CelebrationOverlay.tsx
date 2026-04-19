import type { CSSProperties } from "react";
import { useEffect } from "react";

const CONFETTI_COLORS = ["#f59e0b", "#ef4444", "#14b8a6", "#2563eb", "#f97316", "#22c55e"];
const PIECE_COUNT = 24;
const CONFETTI_DURATION_MS = 2600;

export const CelebrationOverlay = ({
  burstKey,
  onComplete,
}: {
  burstKey: number;
  onComplete: () => void;
}) => {
  useEffect(() => {
    const timeoutId = window.setTimeout(onComplete, CONFETTI_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [burstKey, onComplete]);

  return (
    <div className="confetti-overlay" aria-hidden="true">
      {Array.from({ length: PIECE_COUNT }, (_, index) => {
        const left = `${4 + ((index * 91) % 92)}%`;
        const delay = `${((index * 73) % 420) / 1000}s`;
        const duration = `${1.6 + ((index * 37) % 90) / 100}s`;
        const drift = `${-140 + ((index * 47) % 280)}px`;
        const rotation = `${((index * 67) % 240) - 120}deg`;
        const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
        const shape = index % 3 === 0 ? "50%" : "0.45rem";

        return (
          <span
            key={`${burstKey}-${index}`}
            className="confetti-piece"
            style={
              {
                "--confetti-left": left,
                "--confetti-delay": delay,
                "--confetti-duration": duration,
                "--confetti-drift": drift,
                "--confetti-rotation": rotation,
                "--confetti-color": color,
                "--confetti-radius": shape,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
};
