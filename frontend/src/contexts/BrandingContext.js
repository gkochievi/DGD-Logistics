import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { applyColorTheme, DEFAULT_COLOR_THEME } from '../utils/colorThemes';

const BrandingContext = createContext({});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    siteName: null,
    siteIconUrl: null,
    faviconUrl: null,
    colorTheme: DEFAULT_COLOR_THEME,
  });

  const setColorTheme = useCallback((themeKey) => {
    applyColorTheme(themeKey);
    setBranding((prev) => ({ ...prev, colorTheme: themeKey }));
  }, []);

  useEffect(() => {
    api.get('/landing/').then(({ data }) => {
      const themeKey = data.color_theme || DEFAULT_COLOR_THEME;
      setBranding({
        siteName: data.site_name || null,
        siteIconUrl: data.site_icon_url || null,
        faviconUrl: data.favicon_url || null,
        colorTheme: themeKey,
      });
      applyColorTheme(themeKey);

      if (data.site_name) {
        document.title = data.site_name;
      }

      if (data.favicon_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.favicon_url;
      }
    }).catch(() => {});
  }, []);

  // Re-apply palette when light/dark mode toggles, so accent picks the right shade.
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          applyColorTheme(branding.colorTheme || DEFAULT_COLOR_THEME);
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [branding.colorTheme]);

  return (
    <BrandingContext.Provider value={{ ...branding, setColorTheme }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
