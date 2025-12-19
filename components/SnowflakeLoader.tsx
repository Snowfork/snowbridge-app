"use client";

import { FC } from "react";

interface SnowflakeLoaderProps {
  message?: string;
}

export const SnowflakeLoader: FC<SnowflakeLoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative">
        <span
          className="text-7xl animate-spin-slow inline-block"
          style={{
            color: "white",
            textShadow: "0 0 20px rgba(255,255,255,0.5)",
          }}
        >
          ❄
        </span>
      </div>
      {message && (
        <p className="text-base text-white font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
