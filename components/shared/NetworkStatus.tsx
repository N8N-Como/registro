
import React, { useState, useEffect } from 'react';
import { getQueue, processQueue, clearQueue } from '../../services/offlineManager';

const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queueLength, setQueueLength] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            attemptSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check queue size periodically
        const interval = setInterval(() => {
            setQueueLength(getQueue().length);
        }, 2000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const attemptSync = async () => {
        if (getQueue().length === 0) return;
        
        setIsSyncing(true);
        await processQueue();
        setQueueLength(getQueue().length);
        setIsSyncing(false);
    };

    const handleClearQueue = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("¿Seguro que quieres borrar los cambios pendientes? Se perderán los datos que no se hayan subido. Esto soluciona errores de formato antiguos.")) {
            clearQueue();
            localStorage.removeItem('local_time_corrections'); // Limpiar también cache de mockApi
            setQueueLength(0);
            window.location.reload();
        }
    };

    if (isOnline && queueLength === 0) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-2 text-center text-sm font-medium z-50 transition-colors shadow-2xl ${
            !isOnline ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
        }`}>
            {!isOnline && (
                <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path></svg>
                    <span>Modo Offline: {queueLength} cambios pendientes.</span>
                </div>
            )}
            {isOnline && isSyncing && (
                <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Sincronizando datos... ({queueLength} restantes)</span>
                </div>
            )}
            {isOnline && !isSyncing && queueLength > 0 && (
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={attemptSync}>
                        <span>⚠ {queueLength} cambios bloqueados. Pulsa para reintentar.</span>
                    </div>
                    <button onClick={handleClearQueue} className="text-[10px] bg-white/20 hover:bg-white/40 px-2 py-1 rounded uppercase font-bold border border-white/30">
                        Limpiar cola y reset
                    </button>
                </div>
            )}
        </div>
    );
};

export default NetworkStatus;
