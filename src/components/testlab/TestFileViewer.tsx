import React, { useState } from 'react';
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export interface TestMethodItem {
  id: string;
  name: string;
  summary: string;
  expectedBehavior: string;
  javaCode: string;
  defaultParams?: Record<string, any>;
  onRun?: (params: Record<string, any>) => Promise<{ passed: boolean; message: string; details: any }>;
}

export interface TestFileViewerProps {
  fileName: string;
  filePath: string;
  description: string;
  targetClasses: string[];
  totalMethodsCount: number;
  methods: TestMethodItem[];
}

export const TestFileViewer: React.FC<TestFileViewerProps> = ({
  fileName,
  filePath,
  description,
  targetClasses,
  totalMethodsCount,
  methods,
}) => {
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [methodParams, setMethodParams] = useState<Record<string, Record<string, any>>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { passed: boolean; message: string; details: any }>>({});
  const [searchKeyword, setSearchKeyword] = useState('');

  const toggleCode = (id: string) => {
    setExpandedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getParam = (m: TestMethodItem, key: string, fallback: any) => {
    return methodParams[m.id]?.[key] ?? m.defaultParams?.[key] ?? fallback;
  };

  const updateParam = (mId: string, key: string, val: any) => {
    setMethodParams((prev) => ({
      ...prev,
      [mId]: {
        ...(prev[mId] || {}),
        [key]: val,
      },
    }));
  };

  const handleRun = async (m: TestMethodItem) => {
    if (!m.onRun) {
      alert('이 테스트 메서드는 준비 중입니다.');
      return;
    }
    setRunningId(m.id);
    try {
      const currentParams = {
        ...(m.defaultParams || {}),
        ...(methodParams[m.id] || {}),
      };
      const res = await m.onRun(currentParams);
      setResults((prev) => ({ ...prev, [m.id]: res }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [m.id]: {
          passed: false,
          message: `실행 중 예외 발생: ${err.message}`,
          details: err.response?.data || err,
        },
      }));
    } finally {
      setRunningId(null);
    }
  };

  const filteredMethods = methods.filter((m) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return m.name.toLowerCase().includes(kw) || m.summary.toLowerCase().includes(kw);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 파일 상단 메타데이터 카드 */}
      <div className="card" style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode2 size={24} color="#38bdf8" />
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>{fileName}</h2>
              <span className="badge badge-info" style={{ background: '#0284c7', color: '#ffffff' }}>
                총 {totalMethodsCount}개 테스트
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
              📂 {filePath}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {targetClasses.map((cls, idx) => (
              <span
                key={idx}
                style={{
                  background: '#1e293b',
                  color: '#38bdf8',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  border: '1px solid #334155',
                }}
              >
                @{cls}
              </span>
            ))}
          </div>
        </div>

        <p style={{ margin: '14px 0 0 0', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
          {description}
        </p>
      </div>

      {/* 검색 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="테스트 메서드명 또는 설명 검색..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ width: '320px', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          검색 결과: <strong>{filteredMethods.length}</strong> / {methods.length}개
        </span>
      </div>

      {/* 테스트 메서드 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredMethods.map((m) => {
          const isRunning = runningId === m.id;
          const isExpanded = !!expandedCodes[m.id];
          const result = results[m.id];

          return (
            <div key={m.id} className="card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0f172a' }}>
                    {m.name.replace(/_/g, ' ')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                    {m.summary}
                  </p>
                </div>

                {m.onRun && (
                  <button
                    className="btn-primary-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', background: '#0284c7' }}
                    onClick={() => handleRun(m)}
                    disabled={isRunning}
                  >
                    <Play size={12} fill="currentColor" /> {isRunning ? '실행 중...' : '실습 실행'}
                  </button>
                )}
              </div>

              {/* 기대 결과 (Assertion) */}
              <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', color: '#334155' }}>
                <strong>🎯 핵심 검증 (Assertion):</strong> {m.expectedBehavior}
              </div>

              {/* Java 원본 코드 토글 */}
              <div style={{ marginTop: '10px' }}>
                <button
                  className="btn-ghost btn-sm"
                  style={{ padding: 0, fontSize: '11px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => toggleCode(m.id)}
                >
                  <Code2 size={13} /> {isExpanded ? 'Java 코드 닫기' : 'Java 원본 테스트 코드 보기'}
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '8px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
                    <div style={{ color: '#38bdf8', marginBottom: '6px' }}>// @Test {m.name}()</div>
                    <pre style={{ margin: 0 }}>{m.javaCode}</pre>
                  </div>
                )}
              </div>

              {/* 실습 실행 결과 창 */}
              {result && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '6px',
                    background: result.passed ? '#f0fdf4' : '#fef2f2',
                    border: result.passed ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {result.passed ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <XCircle size={16} color="#dc2626" />
                    )}
                    <strong style={{ fontSize: '13px', color: result.passed ? '#15803d' : '#b91c1c' }}>
                      {result.passed ? 'ASSERTION PASSED (검증 성공)' : 'ASSERTION FAILED (검증 실패)'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e293b', marginBottom: '6px' }}>
                    {result.message}
                  </div>
                  {result.details && (
                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px', maxHeight: '160px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, fontFamily: 'monospace' }}>
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
