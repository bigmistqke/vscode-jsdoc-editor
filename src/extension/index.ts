import * as fs from 'fs'
import * as ts from 'typescript'
import * as vscode from 'vscode'
import { DevConfig, createActivate } from './lib'

export type Comment = { source: string; line: number; range: vscode.Range; target?: string; breadcrumbs: string[] }
type CommentsByFile = Record<string, Comment[]>

const devConfig: DevConfig = {
  location: 'localhost',
  port: '6969',
  entry: 'src/webview/index.tsx',
}

export const activate = createActivate((panel: vscode.WebviewPanel) => {
  let comments: Record<string, Comment[]> = {} // Store comments grouped by file

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

      commentsByFile[file.fsPath] = extractJSDocWithBreadcrumbs(file.fsPath)
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
    const updatedComments = await extractJSDocWithBreadcrumbs(document.uri.fsPath)
    comments[filePath] = updatedComments
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

// Function to extract JSDoc comments and breadcrumbs
function extractJSDocWithBreadcrumbs(fileName: string): Comment[] {
  // Read the file content
  const fileContent = fs.readFileSync(fileName, 'utf8')

  // Create a source file (AST)
  const sourceFile = ts.createSourceFile(fileName, fileContent, ts.ScriptTarget.Latest, true)

  const commentsWithBreadcrumbs: Comment[] = []

  const nodes = new Set<ts.Node>()

  // Helper function to add breadcrumbs
  function addBreadcrumbs(node: ts.Node, path: string[] = []): void {
    if (nodes.has(node)) return
    nodes.add(node)

    let name: string | undefined

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (declaration.name && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          addBreadcrumbs(declaration, path)
        }
      })
      return
    } else if (
      'name' in node &&
      node.name &&
      (ts.isIdentifier(node.name as ts.Node) || ts.isPrivateIdentifier(node.name as ts.Node))
    ) {
      name = (node.name as ts.Identifier).getText()
    }

    if (name) {
      path = [...path, name]
    }

    // Handling jsDoc Nodes
    if ('jsDoc' in node && node.jsDoc) {
      ;(node.jsDoc as any[]).forEach((jsDoc) => {
        const start = jsDoc.getStart()
        const end = jsDoc.getEnd()
        const startLineChar = sourceFile.getLineAndCharacterOfPosition(start)
        const endLineChar = sourceFile.getLineAndCharacterOfPosition(end)
        const breadcrumb = [...path]
        commentsWithBreadcrumbs.push({
          source: jsDoc.getText(),
          line: startLineChar.line + 1, // Lines are 0-based in TypeScript, converting to 1-based
          range: new vscode.Range(
            new vscode.Position(startLineChar.line, startLineChar.character),
            new vscode.Position(endLineChar.line, endLineChar.character),
          ),
          breadcrumbs: breadcrumb,
        })
      })
    }

    // Handling Nested Structures
    if (
      ts.isTypeLiteralNode(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isObjectLiteralExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      node.forEachChild((member) => {
        if (
          ts.isPropertySignature(member) ||
          ts.isPropertyAssignment(member) ||
          ts.isMethodDeclaration(member) ||
          ts.isConstructorDeclaration(member) ||
          ts.isGetAccessorDeclaration(member) ||
          ts.isSetAccessorDeclaration(member) ||
          ts.isParameter(member)
        ) {
          if (ts.isConstructorDeclaration(member)) {
            addBreadcrumbs(member, [...path, 'Constructor'])
          } else {
            addBreadcrumbs(member, path)
          }

          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            member.parameters.forEach((parameter) => {
              if (ts.isIdentifier(parameter.name)) {
                const parameterName = parameter.name.getText()
                addBreadcrumbs(parameter, [...path, parameterName])
              }
            })
          }
        } else {
          addBreadcrumbs(member, path) // Preserve path for non-named members
        }
      })
    } else {
      ts.forEachChild(node, (childNode) => {
        addBreadcrumbs(childNode, path)
      })
    }
  }

  // Start the breadcrumb addition process
  addBreadcrumbs(sourceFile)

  return commentsWithBreadcrumbs
}
