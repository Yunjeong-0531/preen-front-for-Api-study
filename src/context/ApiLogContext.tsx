import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerLogListener } from '../api/client';
import { ApiLogItem } from '../api/types';

interface ApiLogContextType {
  logs: ApiLogItem[];
  clearLogs: () => void;
  selectedLog: ApiLogItem | null;
  setSelectedLog: (log: ApiLogItem | null) => void;
}

const ApiLogContext = createContext<ApiLogContextType | null>(null);

export const ApiLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<ApiLogItem | null>(null);

  useEffect(() => {
    const unregister = registerLogListener((newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 100)); // 최근 100개 보관
    });
    return () => unregister();
  }, []);

  const clearLogs = () => {
    setLogs([]);
    setSelectedLog(null);
  };

  return (
    <ApiLogContext.Provider value={{ logs, clearLogs, selectedLog, setSelectedLog }}>
      {children}
    </ApiLogContext.Provider>
  );
};

export const useApiLog = () => {
  const context = useContext(ApiLogContext);
  if (!context) {
    throw new Error('useApiLog must be used within ApiLogProvider');
  }
  return context;
};
