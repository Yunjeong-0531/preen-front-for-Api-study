import React, { useState } from 'react';
import { storageApi } from '../../api/storageApi';
import { useAuth } from '../../context/AuthContext';

export const StorageTab: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!isLoggedIn) {
      alert('이미지 업로드는 로그인이 필요합니다.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await storageApi.uploadImage(selectedFile);
      if (res.success && res.data) {
        setUploadedUrl(res.data.url);
        alert('🎉 이미지 업로드 완료! 반환된 URL을 복사하여 숙소나 리뷰에 사용하세요.');
      }
    } catch (err: any) {
      alert('이미지 업로드 실패: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = () => {
    if (uploadedUrl) {
      navigator.clipboard.writeText(uploadedUrl);
      alert('URL이 클립보드에 복사되었습니다.');
    }
  };

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>🖼️ 이미지 업로드 테스트 (POST /api/images)</h2>
        <p className="section-desc">
          서버의 멀티파트 이미지 업로드 기능을 테스트합니다. 숙소, 객실, 리뷰에 등록할 이미지 URL을 생성할 수 있습니다.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 className="card-title">파일 업로드 폼 (Multipart)</h3>

        <div className="form-stack">
          <div className="form-group">
            <label>이미지 파일 선택 (JPG, PNG, WEBP 등)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          {previewUrl && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                로컬 파일 미리보기:
              </div>
              <img
                src={previewUrl}
                alt="Local Preview"
                style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px', objectFit: 'cover' }}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || !isLoggedIn}
            style={{ marginTop: '10px' }}
          >
            {isUploading ? '업로드 진행 중...' : isLoggedIn ? '서버로 업로드' : '로그인 필요'}
          </button>
        </div>

        {uploadedUrl && (
          <div className="alert alert-success" style={{ marginTop: '20px' }}>
            <strong>업로드 성공!</strong>
            <div style={{ marginTop: '8px', wordBreak: 'break-all' }}>
              <code>{uploadedUrl}</code>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button className="btn-outline-sm" onClick={copyUrl}>
                URL 복사하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
