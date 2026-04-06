import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { theme as antdTheme } from 'antd';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);

  const antdThemeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#818cf8' : '#6366f1',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#3b82f6',
      borderRadius: 12,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
      colorBgContainer: isDark ? '#1e2235' : '#ffffff',
      colorBgElevated: isDark ? '#232738' : '#ffffff',
      colorBgLayout: isDark ? '#151823' : '#f8f9fc',
      colorBorder: isDark ? '#2a2e42' : '#e8eaf2',
      colorBorderSecondary: isDark ? '#232738' : '#f0f1f7',
      controlHeight: 44,
      controlHeightLG: 52,
    },
    components: {
      Button: {
        borderRadius: 12,
        controlHeight: 44,
        controlHeightLG: 52,
        fontWeight: 600,
      },
      Input: {
        borderRadius: 12,
        controlHeight: 48,
        activeBorderColor: isDark ? '#818cf8' : '#6366f1',
        hoverBorderColor: isDark ? '#818cf8' : '#6366f1',
      },
      Select: {
        borderRadius: 12,
        controlHeight: 48,
      },
      Card: {
        borderRadiusLG: 16,
      },
      Modal: {
        borderRadiusLG: 20,
      },
    },
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, antdThemeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
