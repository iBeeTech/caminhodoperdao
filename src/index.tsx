import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { queryClient } from './query/queryClient';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';
import './i18n';

/**
 * Componente wrapper para inicializar Amplitude pós-hidratação
 * Evita bloquear o caminho crítico (Core Web Vitals)
 */
function AnalyticsInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Lazy import para não carregar a SDK no server
    import('./services/analytics/amplitude').then(({ initAmplitude }) => {
      initAmplitude();
    });
  }, []);

  return <>{children}</>;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <AnalyticsInitializer>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>
    </AnalyticsInitializer>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
