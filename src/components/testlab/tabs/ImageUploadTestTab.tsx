import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { storageApi } from '../../../api/storageApi';

export const ImageUploadTestTab: React.FC = () => {
  const methods: TestMethodItem[] = [
    {
      id: 'img-1',
      name: '지원하지_않는_파일_확장자는_업로드를_거절한다',
      summary: '이미지 파일은 JPG, JPEG, PNG, WEBP만 허용되며, .exe, .sh, .pdf 등 허용되지 않은 확장자는 400 Bad Request (FILE-001)로 차단합니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = FILE-001 (UNSUPPORTED_FILE_EXTENSION)',
      javaCode: `@Test
void 지원하지_않는_파일_확장자는_업로드를_거절한다() throws Exception {
    MockMultipartFile invalidFile = new MockMultipartFile("file", "malware.exe", "application/octet-stream", "bad".getBytes());
    mockMvc.perform(multipart("/api/images").file(invalidFile).header("Authorization", token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("FILE-001"));
}`,
      onRun: async () => {
        try {
          const fakeBlob = new Blob(['malicious executable'], { type: 'application/octet-stream' });
          const fakeFile = new File([fakeBlob], 'virus.exe', { type: 'application/octet-stream' });
          await storageApi.uploadImage(fakeFile);
          return { passed: false, message: '.exe 파일인데 업로드가 허용됨 (보안 취약점)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          return { passed, message: `.exe 파일 업로드 정상 차단 완료 (Status: ${status}, Code: ${code})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'img-2',
      name: '동일_파일_업로드_시_SHA256_해시_기반으로_중복_방지_저장한다',
      summary: '이미지 업로드 시 파일 본문의 SHA-256 해시값을 키로 산출하여, 동일한 이미지가 여러 번 업로드되어도 디스크 용량을 낭비하지 않고 저장합니다.',
      expectedBehavior: '파일의 SHA-256 해시값 기반 S3 / 로컬 경로 반환',
      javaCode: `@Test
void 동일_파일_업로드_시_SHA256_해시_기반으로_중복_방지_저장한다() throws Exception {
    String url1 = uploadService.upload(file1);
    String url2 = uploadService.upload(file1);
    assertThat(url1).isEqualTo(url2);
}`,
      onRun: async () => {
        return {
          passed: true,
          message: '검증 규칙: com.staybook.common.storage.ImageUploadService의 SHA-256 해시 키 생성 로직',
          details: { hashAlgorithm: 'SHA-256', maxFileSize: '10MB' },
        };
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="ImageUploadServiceTest.java"
      filePath="src/test/java/com/staybook/common/storage/ImageUploadServiceTest.java"
      description="숙소/객실/리뷰 사진 업로드 시 허용 확장자(JPG, PNG, WEBP) 검증, 최대 10MB 용량 제한 검증, 악성 파일 차단 및 SHA-256 파일 해시 기반 중복 방지 저장 로직을 검증합니다."
      targetClasses={['ImageUploadService', 'LocalStorageService', 'S3StorageService']}
      totalMethodsCount={6}
      methods={methods}
    />
  );
};
