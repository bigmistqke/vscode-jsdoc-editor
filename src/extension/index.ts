import * as vscode from 'vscode'
import { Config, createWebviews } from './lib'

const config: Config = {
  dev: {
    location: 'localhost',
    port: '6969',
    entry: 'src/webview/index.tsx',
  },
}

export const activate = createWebviews((panel: vscode.WebviewPanel) => {
  panel.webview.onDidReceiveMessage((message: any) => {
    const command = message.command
    const text = message.text
    switch (command) {
      case 'hello':
        vscode.window.showInformationMessage?.(text)
        return
    }
  })
}, config)
