import { parse } from 'comment-parser'
import * as vscode from 'vscode'
import { DevConfig, createActivate } from './lib'

export type Comment = { source: string; line: number; range: vscode.Range; target?: string }
type CommentsByFile = Record<string, Comment[]>

const devConfig: DevConfig = {
  location: 'localhost',
  port: '6969',
  entry: 'src/webview/index.tsx',
}

export const activate = createActivate((panel: vscode.WebviewPanel) => {
  let comments: Record<string, Comment[]> = {} // Store comments grouped by file

  vscode.window.showInformationMessage?.('ACTIVATE')

  panel.webview.onDidReceiveMessage(async (message: any) => {
    const command = message.command
    const data = message.data

    switch (command) {
      case 'initialize':
        comments = await getJSDocCommentsFromWorkspace()
        panel.webview.postMessage({ command: 'setComments', comments: comments })
        sendCurrentTheme()
        return
      case 'updateComment':
        await updateComment(data.filePath, data.index, data.comment)
        panel.webview.postMessage({ command: 'setComments', comments: comments })
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
            `Unable to connect to development server: http://${devConfig.location}:${devConfig.port}`,
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

  async function getJSDocCommentsFromWorkspace(): Promise<CommentsByFile> {
    const jsFiles = await vscode.workspace.findFiles(
      '**/*.{js,jsx,ts,tsx}',
      '{**/node_modules/**,**/dist/**,**/build/**}',
    )
    let commentsByFile: CommentsByFile = {}

    for (const file of jsFiles) {
      const document = await vscode.workspace.openTextDocument(file)
      commentsByFile[file.fsPath] = await getCommentsForFile(document)
    }

    return commentsByFile
  }

  async function updateComment(filePath: string, index: number, newComment: string) {
    const comment = comments[filePath][index]
    const fileUri = vscode.Uri.file(filePath)
    const document = await vscode.workspace.openTextDocument(fileUri)

    const edit = new vscode.WorkspaceEdit()
    edit.replace(fileUri, comment.range, newComment)
    await vscode.workspace.applyEdit(edit)
    await document.save()

    // Recalculate all ranges for the comments in the updated file
    const updatedComments = await getCommentsForFile(document)
    comments[filePath] = updatedComments
  }

  async function getCommentsForFile(document: vscode.TextDocument): Promise<Comment[]> {
    const content = document.getText()
    const fileComments = parse(content, { spacing: 'preserve' })
    let comments: Comment[] = []

    fileComments.forEach((block) => {
      // Combine the lines into a single string
      const source = block.source.map((line) => line.source).join('\n')

      // Calculate the line number and range of the comment
      const startIndex = content.indexOf(source)
      const line = content.substring(0, startIndex).split('\n').length - 1
      const startPos = document.positionAt(startIndex)
      const endPos = document.positionAt(startIndex + source.length)
      const range = new vscode.Range(startPos, endPos)

      let targetIndex = endPos.line + 1
      let target: string | undefined = 'undefined'

      while (targetIndex < document.lineCount) {
        const targetValue = document.lineAt(targetIndex)

        if (targetValue.text.trimEnd() !== '') {
          target = targetValue.text
          break
        }
        targetIndex++
      }

      comments.push({ source, line, range, target })
    })

    return comments
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
}, devConfig)
