import { configureWebProjectConfig } from '#/lib/web-project-config.ts'

export function configureTestWebProjectConfig() {
  configureWebProjectConfig({
    capabilities: {
      agent: { enabled: true },
      dataRecordMap: { enabled: true },
      languageSwitcher: { enabled: true },
      lcaAiCreateAccounting: { enabled: true },
    },
    routes: {
      loginPath: '/uic/login',
    },
    uploadServices: {
      file: {
        publicUploadPath: '/file.FileWeb/FileService/public/upload',
        publicDownloadPath: '/file.FileWeb/FileService/public/download',
        privateUploadPath: '/file.FileWeb/FileService/upload',
        privateDownloadPath: '/file.FileWeb/FileService/download',
      },
      document: {
        uploadPath: '/uic.DocumentWeb/DocumentService/upload',
        downloadPath: '/uic.DocumentWeb/DocumentService/download',
      },
    },
  })
}
