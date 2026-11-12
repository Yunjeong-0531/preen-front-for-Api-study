import React, { useState } from 'react';
import { InventoryResponse } from '../../api/types';
import { inventoryApi } from '../../api/inventoryApi';

interface InventoryCalendarProps {
  roomId: number;
  inventories: InventoryResponse[];
  onRefresh: (start: string, end: string) => void;
}

export const InventoryCalendar: React.FC<InventoryCalendarProps> = ({
  roomId,
  inventories,
  onRefresh,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1 ~ 12

  // 특정 날짜 단건 수정 팝업 상태
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(150000);
  const [editTotalCount, setEditTotalCount] = useState<number>(5);
  const [editClosed, setEditClosed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 날짜별 재고 맵 (Key: "YYYY-MM-DD")
  const inventoryMap = new Map<string, InventoryResponse>();
  inventories.forEach((inv) => {
    inventoryMap.set(inv.stayDate, inv);
  });

  // 해당 월의 시작일과 종료일 계산
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);

  const startDayOfWeek = startOfMonth.getDay(); // 0(일) ~ 6(토)
  const totalDays = endOfMonth.getDate();

  // 월 이동
  const handlePrevMonth = () => {
    let y = currentYear;
    let m = currentMonth - 1;
    if (m < 1) {
      y -= 1;
      m = 12;
    }
    setCurrentYear(y);
    setCurrentMonth(m);
    fetchMonthData(y, m);
  };

  const handleNextMonth = () => {
    let y = currentYear;
    let m = currentMonth + 1;
    if (m > 12) {
      y += 1;
      m = 1;
    }
    setCurrentYear(y);
    setCurrentMonth(m);
    fetchMonthData(y, m);
  };

  const fetchMonthData = (year: number, month: number) => {
    const s = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const e = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    onRefresh(s, e);
  };

  // 날짜 셀 클릭 시
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = inventoryMap.get(dateStr);
    if (existing) {
      setEditPrice(existing.price);
      setEditTotalCount(existing.totalCount);
      setEditClosed(existing.closed);
    } else {
      setEditPrice(150000);
      setEditTotalCount(5);
      setEditClosed(false);
    }
  };

  // 단건 날짜 저장
  const handleSaveSingleDay = async () => {
    if (!selectedDate || !roomId) return;
    try {
      setIsSaving(true);
      const res = await inventoryApi.setInventories(roomId, {
        startDate: selectedDate,
        endDate: selectedDate,
        totalCount: editTotalCount,
        price: editPrice,
        closed: editClosed,
      });
      if (res.success) {
        alert(`${selectedDate} 재고가 수정되었습니다.`);
        setSelectedDate(null);
        fetchMonthData(currentYear, currentMonth);
      }
    } catch (err: any) {
      alert('재고 수정 실패: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="calendar-container">
      {/* 캘린더 상단 네비게이션 */}
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-outline-sm" onClick={handlePrevMonth}>
            ◀ 이전 달
          </button>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            📅 {currentYear}년 {currentMonth}월 재고 현황
          </h3>
          <button className="btn-outline-sm" onClick={handleNextMonth}>
            다음 달 ▶
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          * 날짜를 클릭하면 해당 일자의 요금과 수량을 즉시 수정할 수 있습니다.
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="calendar-week-header">
        {daysOfWeek.map((day, idx) => (
          <div
            key={day}
            className="calendar-week-cell"
            style={{ color: idx === 0 ? '#ef4444' : idx === 6 ? '#0284c7' : '#475569' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="calendar-grid">
        {/* 이전 달 빈 칸 */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day-cell empty" />
        ))}

        {/* 이번 달 날짜들 */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
            dayNum
          ).padStart(2, '0')}`;
          const inv = inventoryMap.get(dateStr);
          const hasData = !!inv;
          const remaining = inv ? inv.totalCount - inv.bookedCount - inv.heldCount : 0;
          const isClosed = inv ? inv.closed : false;

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={`calendar-day-cell ${hasData ? 'has-data' : 'no-data'} ${
                isClosed ? 'closed' : ''
              } ${selectedDate === dateStr ? 'selected' : ''}`}
            >
              <div className="day-number">{dayNum}</div>

              {hasData ? (
                <div className="day-content">
                  <div className="day-price">
                    {inv.price.toLocaleString()}원
                  </div>
                  <div className="day-stock">
                    {isClosed ? (
                      <span className="badge-closed">마감</span>
                    ) : (
                      <span className={`badge-remaining ${remaining === 0 ? 'zero' : ''}`}>
                        잔여 {remaining}/{inv.totalCount}
                      </span>
                    )}
                  </div>
                  {(inv.bookedCount > 0 || inv.heldCount > 0) && (
                    <div className="day-status-detail">
                      {inv.bookedCount > 0 && <span style={{ color: '#16a34a' }}>예약 {inv.bookedCount}</span>}
                      {inv.heldCount > 0 && <span style={{ color: '#ea580c' }}>선점 {inv.heldCount}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="day-empty-hint">미등록</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 날짜 클릭 시 퀵 수정 모달/패널 */}
      {selectedDate && (
        <div className="quick-edit-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>
              ✏️ {selectedDate} 재고 및 요금 수정 (Room ID #{roomId})
            </h4>
            <button className="btn-ghost btn-sm" onClick={() => setSelectedDate(null)}>
              ✕ 닫기
            </button>
          </div>

          <div className="form-inline-group" style={{ marginTop: '10px' }}>
            <div className="form-group">
              <label>1박 요금 (원)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                style={{ width: '120px' }}
              />
            </div>

            <div className="form-group">
              <label>판매 수량</label>
              <input
                type="number"
                value={editTotalCount}
                onChange={(e) => setEditTotalCount(Number(e.target.value))}
                min={0}
                style={{ width: '80px' }}
              />
            </div>

            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label>판매 상태</label>
              <label className="checkbox-row" style={{ marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={editClosed}
                  onChange={(e) => setEditClosed(e.target.checked)}
                />
                <span style={{ color: editClosed ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                  {editClosed ? '🔴 판매 마감' : '🟢 판매 중'}
                </span>
              </label>
            </div>

            <button
              className="btn-primary"
              onClick={handleSaveSingleDay}
              disabled={isSaving}
              style={{ alignSelf: 'flex-end', height: '36px' }}
            >
              {isSaving ? '저장 중...' : '이 날짜만 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
