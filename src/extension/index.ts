import * as vscode from 'vscode'
import { DevConfig, createActivate } from './lib'

const devConfig: DevConfig = {
  location: 'localhost',
  port: '6969',
  entry: 'src/webview/index.tsx',
}

export const activate = createActivate((panel: vscode.WebviewPanel) => {
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
            `Unable to connect to development server: http://${devConfig.location}:${devConfig.port}`,
          )
        }
        return
    }
  })
}, devConfig)
