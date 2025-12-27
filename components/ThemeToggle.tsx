"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="p-2 rounded-full glass-pill transition-all"
        aria-label="Toggle theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="w-4 h-4" />;
      case "dark":
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light mode";
      case "dark":
        return "Dark mode";
      default:
        return "System theme";
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-2 rounded-full glass-pill hover:glass-pill-hover transition-all"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}
