import * as ts from 'typescript'
import * as vscode from 'vscode'
import { Comment } from './types'

function getNodeIndentation(sourceFile: ts.SourceFile, node: ts.Node): string {
  const startPosition = node.getStart(sourceFile)
  const { line } = sourceFile.getLineAndCharacterOfPosition(startPosition)
  const lineText = sourceFile.getFullText().split('\n')[line]
  const leadingWhitespaceMatch = lineText.match(/^(\s*)/)
  return leadingWhitespaceMatch ? leadingWhitespaceMatch[1] : ''
}

// Function to extract JSDoc comments and breadcrumbs
export function extractComments(document: vscode.TextDocument): Comment[] {
  const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, true)
  const comments: Comment[] = []
  const nodes = new Set<ts.Node>()

  // Helper function to traverse and extract comments + collect breadcrumbs
  function traverse(node: ts.Node, breadcrumbs: string[] = []): void {
    if (nodes.has(node)) return
    nodes.add(node)

    const name = ts.isVariableStatement(node)
      ? (node.declarationList.declarations[0].name as ts.Identifier).text
      : 'name' in node &&
        node.name &&
        (ts.isIdentifier(node.name as ts.Node) || ts.isPrivateIdentifier(node.name as ts.Node))
      ? (node.name as ts.Identifier).getText()
      : undefined

    if (name) {
      breadcrumbs = [...breadcrumbs, name]
    } else if (ts.isConstructorDeclaration(node)) {
      breadcrumbs = [...breadcrumbs, 'Constructor']
    }

    // Handling jsDoc Nodes
    if ('jsDoc' in node && node.jsDoc) {
      ;(node.jsDoc as any[]).forEach((jsDoc) => {
        const start = jsDoc.getStart()
        const end = jsDoc.getEnd()
        const startLineChar = sourceFile.getLineAndCharacterOfPosition(start)
        const endLineChar = sourceFile.getLineAndCharacterOfPosition(end)
        comments.push({
          source: jsDoc.getText(),
          line: startLineChar.line,
          range: new vscode.Range(
            new vscode.Position(startLineChar.line, startLineChar.character),
            new vscode.Position(endLineChar.line, endLineChar.character),
          ),
          breadcrumbs: [...breadcrumbs],
          indentation: getNodeIndentation(sourceFile, node),
        })
      })
    }

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (declaration.name && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          traverse(declaration, breadcrumbs.slice(0, -1))
        }
      })
    }
    // Handling Nested Structures
    else if (
      ts.isTypeLiteralNode(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isObjectLiteralExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isEnumDeclaration(node)
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
          traverse(member, breadcrumbs)

          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            member.parameters.forEach((parameter) => {
              if (ts.isIdentifier(parameter.name)) {
                const parameterName = parameter.name.getText()
                traverse(parameter, [...breadcrumbs, parameterName])
              }
            })
          }
        } else {
          traverse(member, breadcrumbs) // Preserve path for non-named members
        }
      })
    } else {
      ts.forEachChild(node, (childNode) => traverse(childNode, breadcrumbs))
    }
  }

  traverse(sourceFile)

  return comments
}
