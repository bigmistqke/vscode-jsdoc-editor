import type { WebviewApi } from 'vscode-webview'

export {}

declare global {
  interface Window {
    vscode: WebviewApi<any>
  }
}
