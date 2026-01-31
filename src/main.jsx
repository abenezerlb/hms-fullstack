import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './hooks/useToast';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AppProvider>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </AppProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>
);
