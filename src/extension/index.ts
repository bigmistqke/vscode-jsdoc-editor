import * as vscode from 'vscode'
import { extractComments } from './extract-comments'
import { Config, createActivate } from './lib'
import { File, RegexConfig } from './types'
import { composeRegex } from './utils/compose-regex'

const config: Config = {
  csp: {
    'img-src': ['vscode-resource:', 'https:', 'http:', 'data:'],
    'script-src': ['*', 'data:', 'blob:', `'unsafe-inline'`, `'unsafe-eval'`],
    'style-src': [`vscode-resource:`, `'unsafe-inline'`, `http:`, `https:`, `data:`],
    'connect-src': [`https://*`],
  },
  dev: {
    location: 'localhost',
    port: '6969',
    entry: 'src/webview/index.tsx',
  },
}

export const activate = createActivate((panel: vscode.WebviewPanel) => {
  let files: File[] = []

  panel.webview.onDidReceiveMessage(async (message: any) => {
    const command = message.command
    const data = message.data

    switch (command) {
      case 'initialize':
        files = await extractCommentsFromWorkspace()
        panel.webview.postMessage({ command: 'setComments', comments: files })
        sendCurrentTheme()
        return
      case 'update':
        await updateComment(data.filePath, data.index, data.comment)
        panel.webview.postMessage({ command: 'setComments', comments: files })
        return
      case 'updateAll':
        await updateAll(data)
        panel.webview.postMessage({ command: 'setComments', comments: files })
        return
      case 'openFileAtLine':
        await openFileAtLine(data.filePath, data.line)
        return
      case 'hello':
        vscode.window.showInformationMessage?.(data.text)
        return
      case 'dev:load':
        if (data.text === 'error') {
          vscode.window.showErrorMessage?.(
            `Unable to connect to development server: http://${config.dev.location}:${config.dev.port}`,
          )
        }
        return
    }
  })

  // Function to send the current theme to the webview
  function sendCurrentTheme() {
    const theme = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme')
    panel.webview.postMessage({ command: 'setTheme', theme })
  }

  // Listen to configuration changes to detect theme changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('workbench.colorTheme')) {
      sendCurrentTheme()
    }
  })

  // Immediately load comments when the panel is created
  panel.webview.postMessage({ command: 'loadComments' })

  async function extractCommentsFromWorkspace(): Promise<File[]> {
    return Promise.all(
      await vscode.workspace
        .findFiles('**/*.{js,jsx,ts,tsx}', '{**/node_modules/**,**/dist/**,**/build/**}')
        .then((files) =>
          files.map(async (file) => ({
            comments: extractComments(await vscode.workspace.openTextDocument(file)),
            path: file.fsPath,
            relativePath: vscode.workspace.asRelativePath(file.fsPath),
          })),
        ),
    )
  }

  async function updateComment(filePath: string, index: number, newComment: string) {
    const file = files.find(({ path }) => path === filePath)

    if (!file) {
      console.error('file is undefined', filePath)
      return
    }

    const comment = file.comments[index]

    if (!comment) {
      console.error('comment is undefined')
      return
    }

    const fileUri = vscode.Uri.file(filePath)
    const document = await vscode.workspace.openTextDocument(fileUri)

    const edit = new vscode.WorkspaceEdit()
    edit.replace(fileUri, comment.range, newComment)
    await vscode.workspace.applyEdit(edit)
    await document.save()

    // Recalculate all ranges for the comments in the updated file
    file.comments = extractComments(document)
  }

  async function updateAll(config: { search: RegexConfig; replace: string }) {
    return Promise.all(
      files.map(async (file) => {
        const fileUri = vscode.Uri.file(file.path)
        const document = await vscode.workspace.openTextDocument(fileUri)
        const source = document.getText()

        // Find all matches
        const matches = [...source.matchAll(composeRegex(config.search))]

        // Create a workspace edit
        const edit = new vscode.WorkspaceEdit()
        matches.forEach((match) => {
          if (match.index !== undefined) {
            const startPos = document.positionAt(match.index)
            const endPos = document.positionAt(match.index + match[0].length)
            const range = new vscode.Range(startPos, endPos)
            edit.replace(document.uri, range, config.replace)
          }
        })

        // Apply the edit
        await vscode.workspace.applyEdit(edit)
        await document.save()

        if (matches.length > 0) {
          // Recalculate all ranges for the comments in the updated file
          file.comments = extractComments(document)
        }
      }),
    )
  }

  async function openFileAtLine(filePath: string, line: number) {
    const fileUri = vscode.Uri.file(filePath)
    const document = await vscode.workspace.openTextDocument(fileUri)
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn: panel.viewColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : vscode.ViewColumn.One,
      preserveFocus: false,
    })

    const position = new vscode.Position(line, 0)
    const selection = new vscode.Selection(position, position)
    editor.selection = selection
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter)
  }
}, config)
