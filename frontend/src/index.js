import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { BrandingProvider } from './contexts/BrandingContext';
import './theme.css';
import App from './App';

function ThemedApp() {
  const { antdThemeConfig } = useTheme();
  return (
    <ConfigProvider theme={antdThemeConfig}>
      <App />
    </ConfigProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <BrandingProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </BrandingProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
