"use client";

import { FC } from "react";

interface SnowflakeLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const SnowflakeLoader: FC<SnowflakeLoaderProps> = ({
  message,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "text-5xl",
    md: "text-7xl",
    lg: "text-8xl",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative">
        <span
          className={`${sizeClasses[size]} animate-spin-slow inline-block`}
          style={{
            color: "white",
            textShadow: "0 0 20px rgba(255,255,255,0.5)",
          }}
        >
          ❄
        </span>
      </div>
      {message && (
        <p
          className={`${textClasses[size]} text-white font-medium animate-pulse`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
