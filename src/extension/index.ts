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
      case 'dev:load':
        if (text === 'error') {
          vscode.window.showErrorMessage?.(
            `Unable to connect to development server: http://${config.dev.location}:${config.dev.port}/${config.dev.entry}`,
          )
        }
        return
    }
  })
}, config)
