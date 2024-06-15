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

function getWorkspaceRootPaths(): string[] {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders && workspaceFolders.length > 0) {
    // Return the path of the first workspace folder
    return workspaceFolders.map((folder) => folder.uri.fsPath)
  }
  return []
}

async function getModfiedFromUri(uri: vscode.Uri) {
  return (await vscode.workspace.fs.stat(uri)).mtime
}

export const activate = createActivate((panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => {
  let files: File[] = []

  const rootPaths = getWorkspaceRootPaths()

  if (rootPaths.length === 0) return

  const CACHE_KEY = `jsdoc-editor-${rootPaths.join('-')}`

  // Function to send the comments to the webviez
  function sendFiles() {
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
      case 'initialise':
        files = await extractCommentsFromWorkspace()
        sendFiles()
        sendCurrentTheme()
        saveCachedFiles()
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

    const modified = await getModfiedFromUri(document.uri)

    if (file && file.modified === modified) return
    if (file && updatingMap.has(file)) return

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

    sendFiles()
    saveCachedFiles()
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
          modified: await getModfiedFromUri(document.uri),
        })
      }
    }
    sendFiles()
    saveCachedFiles()
  })

  context.subscriptions.push(fileCreateHandler)

  // Watch for deleted files
  const fileDeleteHandler = vscode.workspace.onDidDeleteFiles(async (event) => {
    for (const deletedFile of event.files) {
      files = files.filter((file) => file.path !== deletedFile.fsPath)
    }
    sendFiles()
    saveCachedFiles()
  })

  context.subscriptions.push(fileDeleteHandler)

  function saveCachedFiles() {
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
    const uris = await vscode.workspace.findFiles('**/*.{js,jsx,ts,tsx}', '{**/node_modules/**,**/dist/**,**/build/**}')

    return Promise.all(
      uris.map(async (uri) => {
        const modified = await getModfiedFromUri(uri)
        const cachedFile = cachedFiles.find((file) => file.path === uri.fsPath)

        if (cachedFile && cachedFile.modified === modified) {
          return cachedFile
        }

        const document = await vscode.workspace.openTextDocument(uri)

        return {
          comments: extractComments(document),
          path: uri.fsPath,
          relativePath: vscode.workspace.asRelativePath(uri.fsPath),
          modified,
        }
      }),
    ).then((files) => files.sort((a, b) => (a.path < b.path ? -1 : 1)))
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

  let updatingMap = new Map<File, vscode.WorkspaceEdit>()

  async function updateAll(config: { search: RegexConfig; replace: string }) {
    if (updatingMap.size > 0) {
      console.error('No updateAll-call can be called while another updateAll-call is still progressing')
      return
    }

    for (const file of files) {
      const fileUri = vscode.Uri.file(file.path)
      const regex = composeRegex(config.search)

      let hasMatch = false

      // Create a workspace edit
      const edit = new vscode.WorkspaceEdit()
      for (const comment of file.comments) {
        if (comment.source.match(regex)) {
          hasMatch = true
          const source = comment.source.replaceAll(regex, config.replace)
          edit.replace(fileUri, comment.range, source)
        }
      }

      if (hasMatch) {
        updatingMap.set(file, edit)
      }
    }

    try {
      await Promise.all(
        Array.from(updatingMap.entries()).map(async ([file, edit]) => {
          const fileUri = vscode.Uri.file(file.path)
          const document = await vscode.workspace.openTextDocument(fileUri)
          // Apply the edit
          await vscode.workspace.applyEdit(edit)
          await document.save()
          // We update file manually instead of relying on the onDidSaveTextDocument-listener,
          // so that we can execute all of the edits and then send the updated files to the client.
          file.modified = await getModfiedFromUri(fileUri)
          file.comments = extractComments(document)
        }),
      )
    } finally {
      updatingMap.clear()
      sendFiles()
      saveCachedFiles()
    }
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
