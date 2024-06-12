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

const CACHE_KEY = 'jsdoooc'

export const activate = createActivate((panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => {
  let files: File[] = []

  // Function to send the comments to the webviez
  function sendComments() {
    panel.webview.postMessage({ command: 'setFiles', files })
  }

  // Function to send the current theme to the webview
  function sendCurrentTheme() {
    const theme = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme')
    panel.webview.postMessage({ command: 'setTheme', theme })
  }

  panel.webview.onDidReceiveMessage(async (message: any) => {
    const command = message.command
    const data = message.data

    switch (command) {
      case 'initialize':
        files = await extractCommentsFromWorkspace()
        sendComments()
        sendCurrentTheme()
        return
      case 'update':
        await updateComment(data.filePath, data.index, data.comment)
        return
      case 'updateAll':
        await updateAll(data)
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

  // Listen to configuration changes to detect theme changes
  const themeDocumentChangeHandler = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('workbench.colorTheme')) {
      sendCurrentTheme()
    }
  })
  // Add handler to subscriptions so it is cleaned up
  context.subscriptions.push(themeDocumentChangeHandler)

  // Immediately load comments when the panel is created
  panel.webview.postMessage({ command: 'loadComments' })

  // Watch for changes in the currently opened text documents
  const textDocumentSaveHandler = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const file = files.find(({ path }) => path === document.uri.fsPath)
    const modified = await getModfiedDocument(document)
    if (file) {
      file.comments = extractComments(document)
      file.modified = modified
    } else {
      files.push({
        modified,
        comments: extractComments(await vscode.workspace.openTextDocument(file)),
        path: document.uri.fsPath,
        relativePath: vscode.workspace.asRelativePath(document.uri.fsPath),
      })
    }
    sendComments()
    saveCachedComments()
  })
  // Add handler to subscriptions so it is cleaned up
  context.subscriptions.push(textDocumentSaveHandler)

  // Watch for newly created files
  const fileCreateHandler = vscode.workspace.onDidCreateFiles(async (event) => {
    for (const uri of event.files) {
      if (uri.path.match(/\.(js|jsx|ts|tsx)$/)) {
        const document = await vscode.workspace.openTextDocument(uri)
        files.push({
          comments: extractComments(document),
          path: uri.fsPath,
          relativePath: vscode.workspace.asRelativePath(uri.fsPath),
          modified: await getModfiedDocument(document),
        })
      }
    }
    sendComments()
    saveCachedComments()
  })

  context.subscriptions.push(fileCreateHandler)

  // Watch for deleted files
  const fileDeleteHandler = vscode.workspace.onDidDeleteFiles(async (event) => {
    for (const deletedFile of event.files) {
      files = files.filter((file) => file.path !== deletedFile.fsPath)
    }
    sendComments()
    saveCachedComments()
  })

  context.subscriptions.push(fileDeleteHandler)

  function saveCachedComments() {
    context.globalState.update(
      CACHE_KEY,
      files.map((file) => {
        return {
          ...file,
          comments: file.comments.map((comment) => ({
            ...comment,
            // NOTE:  we have to manually serialize vscode.Range
            //        default it serializes to [start, end]
            range: {
              start: {
                line: comment.range.start.line,
                character: comment.range.start.character,
              },
              end: {
                line: comment.range.end.line,
                character: comment.range.end.character,
              },
            },
          })),
        }
      }),
    )
  }

  async function extractCommentsFromWorkspace(): Promise<File[]> {
    const cachedFiles = context.globalState.get<File[]>(CACHE_KEY, [])

    return Promise.all(
      await vscode.workspace
        .findFiles('**/*.{js,jsx,ts,tsx}', '{**/node_modules/**,**/dist/**,**/build/**}')
        .then((uris) =>
          uris.map(async (uri) => {
            const document = await vscode.workspace.openTextDocument(uri)
            const modified = await getModfiedDocument(document)

            const cachedFile = cachedFiles.find((file) => file.path === uri.fsPath)
            if (cachedFile && cachedFile.modified === modified) {
              return cachedFile
            }

            return {
              comments: extractComments(document),
              path: uri.fsPath,
              relativePath: vscode.workspace.asRelativePath(uri.fsPath),
              modified,
            }
          }),
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

async function getModfiedDocument(document: vscode.TextDocument) {
  return (await vscode.workspace.fs.stat(document.uri)).mtime
}
