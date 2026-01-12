"use client";

import { FC, useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  opacity: number;
  drift: number;
}

export const BackgroundSnowfall: FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Generate 20-30 snowflakes for the background
    const count = Math.floor(Math.random() * 11) + 20;
    const flakes: Snowflake[] = [];

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100, // 0-100% from left
        animationDuration: Math.random() * 10 + 10, // 10-20s for slow fall
        animationDelay: Math.random() * 10, // 0-10s staggered start
        size: Math.random() * 16 + 16, // 16-32px (doubled)
        opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7 opacity
        drift: (Math.random() - 0.5) * 100, // -50px to +50px horizontal drift
      });
    }

    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute animate-slowSnowfall"
          style={{
            left: `${flake.left}%`,
            top: "-20px",
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.animationDelay}s`,
            color: "var(--snowflake-color)",
            ["--drift" as string]: `${flake.drift}px`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};
