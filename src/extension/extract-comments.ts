import * as ts from 'typescript'
import * as vscode from 'vscode'
import { Comment } from './types'

// Function to extract JSDoc comments and breadcrumbs
export function extractComments(document: vscode.TextDocument): Comment[] {
  const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, true)
  const comments: Comment[] = []
  const nodes = new Set<ts.Node>()

  // Helper function to traverse and extract comments + collect breadcrumbs
  function traverse(node: ts.Node, path: string[] = []): void {
    if (nodes.has(node)) return
    nodes.add(node)

    let name: string | undefined

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (declaration.name && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          traverse(declaration, path)
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
        comments.push({
          source: jsDoc.getText(),
          line: startLineChar.line,
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
            traverse(member, [...path, 'Constructor'])
          } else {
            traverse(member, path)
          }

          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            member.parameters.forEach((parameter) => {
              if (ts.isIdentifier(parameter.name)) {
                const parameterName = parameter.name.getText()
                traverse(parameter, [...path, parameterName])
              }
            })
          }
        } else {
          traverse(member, path) // Preserve path for non-named members
        }
      })
    } else {
      ts.forEachChild(node, (childNode) => {
        traverse(childNode, path)
      })
    }
  }

  traverse(sourceFile)

  return comments
}
