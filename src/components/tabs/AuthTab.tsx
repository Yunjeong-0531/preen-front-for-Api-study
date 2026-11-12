import React, { useEffect, useState } from 'react';
import { authApi } from '../../api/authApi';
import { userApi } from '../../api/userApi';
import { termsApi } from '../../api/termsApi';
import { TermItem } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const AuthTab: React.FC = () => {
  const { user, isLoggedIn, login, logout, fetchMe } = useAuth();

  // 약관 상태
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [agreedTermIds, setAgreedTermIds] = useState<number[]>([]);

  // 회원가입 폼
  const [signupForm, setSignupForm] = useState({
    email: 'guest@example.com',
    password: 'Password123!',
    name: '홍길동',
    phone: '010-1234-5678',
    birthDate: '1995-05-15',
  });
  const [emailCheckResult, setEmailCheckResult] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  // 로그인 폼
  const [loginForm, setLoginForm] = useState({
    email: 'guest@example.com',
    password: 'Password123!',
  });

  // 내 정보 수정 폼
  const [updateForm, setUpdateForm] = useState({
    name: '',
    phone: '',
  });

  // 비밀번호 재설정 폼
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('NewPass123!');

  // 약관 조회
  const loadTerms = async () => {
    try {
      const res = await termsApi.getCurrentTerms();
      if (res.success && res.data) {
        setTerms(res.data);
        // 기본으로 모든 필수 약관 선택
        setAgreedTermIds(res.data.filter((t) => t.required).map((t) => t.id));
      }
    } catch (err: any) {
      alert('약관 로드 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (user) {
      setUpdateForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // 이메일 중복 확인
  const handleCheckEmail = async () => {
    try {
      const res = await authApi.checkEmail(signupForm.email);
      setEmailCheckResult(res.data.available ? '✅ 사용 가능한 이메일입니다.' : '❌ 이미 사용 중인 이메일입니다.');
    } catch (err: any) {
      alert('이메일 중복 확인 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 인증코드 발송
  const handleSendCode = async () => {
    try {
      await authApi.sendEmailCode(signupForm.email);
      setVerifyStatus('✉️ 인증코드가 발송되었습니다. (서버 콘솔/로그를 확인하세요)');
    } catch (err: any) {
      alert('인증코드 발송 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 인증코드 확인
  const handleVerifyCode = async () => {
    try {
      await authApi.verifyEmailCode(signupForm.email, verifyCode);
      setVerifyStatus('✅ 이메일 인증이 완료되었습니다.');
    } catch (err: any) {
      alert('이메일 인증 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 회원가입 제출
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.signup({
        ...signupForm,
        agreedTermIds,
      });
      alert(`회원가입 성공! (User ID: ${res.data.userId}) 바로 로그인해 보세요.`);
      setLoginForm({ email: signupForm.email, password: signupForm.password });
    } catch (err: any) {
      alert('회원가입 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 로그인 제출
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.login(loginForm);
      if (res.success && res.data) {
        await login(res.data);
        alert('로그인 성공!');
      }
    } catch (err: any) {
      alert('로그인 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 내 정보 수정 제출
  const handleUpdateMe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.updateMe(updateForm);
      await fetchMe();
      alert('회원 정보가 수정되었습니다.');
    } catch (err: any) {
      alert('정보 수정 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 회원 탈퇴
  const handleWithdraw = async () => {
    if (!confirm('정말 회원 탈퇴하시겠습니까? 탈퇴 후 즉시 로그아웃됩니다.')) return;
    try {
      await userApi.withdraw();
      await logout();
      alert('탈퇴 처리가 완료되었습니다.');
    } catch (err: any) {
      alert('탈퇴 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 비밀번호 찾기 요청
  const handleForgotPassword = async () => {
    try {
      await authApi.forgotPassword(forgotEmail);
      alert('비밀번호 재설정 이메일 요청 완료. (토큰이 발급되었습니다)');
    } catch (err: any) {
      alert('요청 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 비밀번호 재설정 실행
  const handleResetPassword = async () => {
    try {
      await authApi.resetPassword(resetToken, newPassword);
      alert('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.');
    } catch (err: any) {
      alert('재설정 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 샘플 데이터 빠른 채우기
  const fillGuest = () => {
    const r = Math.floor(Math.random() * 1000);
    setSignupForm({
      email: `guest${r}@test.com`,
      password: 'Password123!',
      name: `게스트${r}`,
      phone: '010-1234-5678',
      birthDate: '1998-07-20',
    });
  };

  const fillHost = () => {
    const r = Math.floor(Math.random() * 1000);
    setSignupForm({
      email: `host${r}@test.com`,
      password: 'Password123!',
      name: `호스트${r}`,
      phone: '010-9876-5432',
      birthDate: '1985-03-12',
    });
  };

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>🔑 회원 가입 & 인증 & 계정 관리</h2>
        <p className="section-desc">
          약관 확인(GET /api/terms), 이메일 인증, 회원가입(POST /api/auth/signup), 로그인(POST /api/auth/login), 토큰 재발급, 내 정보 조회를 테스트합니다.
        </p>
      </div>

      <div className="grid-2col">
        {/* 로그인 & 내 정보 */}
        <div className="card">
          <h3 className="card-title">🔐 로그인 (POST /api/auth/login)</h3>
          {isLoggedIn ? (
            <div className="logged-in-box">
              <div className="alert alert-success">
                <strong>로그인 상태입니다!</strong> 현재 역할:{' '}
                <span className={`role-pill role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
              </div>
              <div className="detail-table">
                <div><strong>사용자 ID:</strong> {user?.id}</div>
                <div><strong>이메일:</strong> {user?.email}</div>
                <div><strong>이름:</strong> {user?.name}</div>
                <div><strong>연락처:</strong> {user?.phone || '(미설정)'}</div>
                <div><strong>생년월일:</strong> {user?.birthDate || '(미설정)'}</div>
                <div><strong>가입일:</strong> {user?.createdAt}</div>
              </div>

              {/* 내 정보 수정 */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <h4>✏️ 내 정보 수정 (PATCH /api/users/me)</h4>
                <form onSubmit={handleUpdateMe} className="form-stack">
                  <div className="form-group">
                    <label>이름</label>
                    <input
                      type="text"
                      value={updateForm.name}
                      onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>연락처</label>
                    <input
                      type="text"
                      value={updateForm.phone}
                      onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn-primary">
                      수정 저장
                    </button>
                    <button type="button" className="btn-danger" onClick={handleWithdraw}>
                      회원 탈퇴 (DELETE /api/users/me)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="form-stack">
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>비밀번호</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-primary btn-block">
                로그인하기
              </button>
            </form>
          )}

          {/* 비밀번호 찾기 및 재설정 */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <h4>🔄 비밀번호 찾기 & 재설정</h4>
            <div className="form-group">
              <label>재설정 요청 이메일 (POST /api/auth/password/forgot)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <button type="button" className="btn-outline-sm" onClick={handleForgotPassword}>
                  요청 발송
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>비밀번호 재설정 (POST /api/auth/password/reset)</label>
              <input
                type="text"
                placeholder="전달받은 토큰값"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                style={{ marginBottom: '4px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="새 비밀번호 (영문+숫자 8자 이상)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" className="btn-primary btn-sm" onClick={handleResetPassword}>
                  재설정 실행
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 회원가입 및 약관 동의 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📝 회원가입 (POST /api/auth/signup)</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" className="btn-outline-sm" onClick={fillGuest}>
                랜덤 게스트 자동완성
              </button>
              <button type="button" className="btn-outline-sm" onClick={fillHost}>
                랜덤 호스트 자동완성
              </button>
            </div>
          </div>

          <form onSubmit={handleSignup} className="form-stack">
            <div className="form-group">
              <label>이메일</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                />
                <button type="button" className="btn-outline-sm" onClick={handleCheckEmail}>
                  중복체크
                </button>
                <button type="button" className="btn-outline-sm" onClick={handleSendCode}>
                  인증코드발송
                </button>
              </div>
              {emailCheckResult && <small style={{ color: '#0369a1' }}>{emailCheckResult}</small>}
              {verifyStatus && <small style={{ color: '#059669', display: 'block' }}>{verifyStatus}</small>}
            </div>

            <div className="form-group">
              <label>인증코드 검증 (선택 테스트)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="숫자 6자리"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
                <button type="button" className="btn-outline-sm" onClick={handleVerifyCode}>
                  코드확인
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>비밀번호 (영문 + 숫자 8자 이상)</label>
              <input
                type="password"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>연락처</label>
              <input
                type="text"
                value={signupForm.phone}
                onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="form-group">
              <label>생년월일 (만 14세 이상 필수)</label>
              <input
                type="date"
                value={signupForm.birthDate}
                onChange={(e) => setSignupForm({ ...signupForm, birthDate: e.target.value })}
                required
              />
            </div>

            {/* 약관 동의 */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>📜 약관 동의 (GET /api/terms)</label>
                <button type="button" className="btn-ghost btn-sm" onClick={loadTerms}>
                  약관 새로고침
                </button>
              </div>
              <div className="terms-container">
                {terms.length === 0 ? (
                  <div style={{ color: '#64748b' }}>등록된 약관이 없습니다.</div>
                ) : (
                  terms.map((term) => {
                    const isChecked = agreedTermIds.includes(term.id);
                    return (
                      <label key={term.id} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAgreedTermIds([...agreedTermIds, term.id]);
                            } else {
                              setAgreedTermIds(agreedTermIds.filter((id) => id !== term.id));
                            }
                          }}
                        />
                        <span>
                          [{term.required ? '필수' : '선택'}] {term.title} (v{term.version})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary btn-block">
              회원가입 완료하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
