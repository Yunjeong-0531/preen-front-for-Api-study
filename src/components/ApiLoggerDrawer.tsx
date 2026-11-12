import React, { useState } from 'react';
import { useApiLog } from '../context/ApiLogContext';
import { ApiLogItem } from '../api/types';

export const ApiLoggerDrawer: React.FC = () => {
  const { logs, clearLogs, selectedLog, setSelectedLog } = useApiLog();
  const [isOpen, setIsOpen] = useState(true);
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterMethod === 'ALL') return true;
    return log.method === filterMethod;
  });

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return '#0284c7';
      case 'POST':
        return '#16a34a';
      case 'PUT':
      case 'PATCH':
        return '#d97706';
      case 'DELETE':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  if (!isOpen) {
    return (
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            padding: '10px 18px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📡 API Logs ({logs.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '340px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        borderTop: '2px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        fontFamily: 'monospace',
        fontSize: '13px',
      }}
    >
      {/* 헤더 바 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>📡 실시간 API 통신 인스펙터</span>
          <span style={{ color: '#94a3b8' }}>총 {logs.length}건</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['ALL', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => setFilterMethod(m)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterMethod === m ? '#38bdf8' : '#334155',
                  color: filterMethod === m ? '#0f172a' : '#cbd5e1',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clearLogs}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              backgroundColor: '#475569',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              backgroundColor: '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ✕ 접기
          </button>
        </div>
      </div>

      {/* 바디: 좌측 리스트, 우측 디테일 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 로그 목록 */}
        <div
          style={{
            width: '42%',
            borderRight: '1px solid #334155',
            overflowY: 'auto',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '16px', color: '#64748b', textAlign: 'center' }}>
              기록된 API 호출이 없습니다. 상단에서 API를 요청해보세요.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #1e293b',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1e293b' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{log.timestamp}</span>
                  <span
                    style={{
                      backgroundColor: getMethodColor(log.method),
                      color: '#fff',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      minWidth: '45px',
                      textAlign: 'center',
                    }}
                  >
                    {log.method}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: log.error ? '#f87171' : '#e2e8f0',
                    }}
                    title={log.url}
                  >
                    {log.url}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: log.error ? '#f87171' : '#4ade80',
                    }}
                  >
                    {log.status || 'ERR'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{log.durationMs}ms</span>
                </div>
              );
            })
          )}
        </div>

        {/* 선택된 로그 상세 */}
        <div
          style={{
            width: '58%',
            overflowY: 'auto',
            padding: '12px 16px',
            backgroundColor: '#020617',
          }}
        >
          {selectedLog ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '6px',
                }}
              >
                <div>
                  <span
                    style={{
                      backgroundColor: getMethodColor(selectedLog.method),
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontWeight: 'bold',
                      marginRight: '8px',
                    }}
                  >
                    {selectedLog.method}
                  </span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{selectedLog.url}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      backgroundColor: '#334155',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    전체 복사
                  </button>
                </div>
              </div>

              {/* Request Data */}
              {selectedLog.requestData && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                    Request Body:
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '8px',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      color: '#cbd5e1',
                      margin: 0,
                      maxHeight: '120px',
                    }}
                  >
                    {JSON.stringify(selectedLog.requestData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Data */}
              <div>
                <div
                  style={{
                    color: selectedLog.error ? '#f87171' : '#4ade80',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Response Status: {selectedLog.status} ({selectedLog.durationMs}ms)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.responseData, null, 2))
                    }
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    응답만 복사
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '8px',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    color: selectedLog.error ? '#fca5a5' : '#86efac',
                    margin: 0,
                    maxHeight: '150px',
                  }}
                >
                  {selectedLog.responseData
                    ? JSON.stringify(selectedLog.responseData, null, 2)
                    : '(응답 본문 없음)'}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>
              좌측 목록에서 API 항목을 클릭하면 요청/응답 상세 JSON이 여기에 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
