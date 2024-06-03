import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import * as path from 'path'
import * as vscode from 'vscode'
import { createContentSecurityPolicyString, getNonce } from './utils'

export type DevConfig = {
  location: string
  port: string
  entry: string
}

export function createActivate(callback: (panel: vscode.WebviewPanel) => void, devConfig: DevConfig) {
  return function activate(context: vscode.ExtensionContext) {
    const isDev = context.extensionMode === vscode.ExtensionMode.Development
    if (isDev) {
      createDevWebview(context, callback, devConfig)
    }
    createWebview(context, callback)
  }
}

function createWebview(context: vscode.ExtensionContext, callback: (panel: vscode.WebviewPanel) => void) {
  const webview = vscode.commands.registerCommand('solid-webview.start', () => {
    let panel = vscode.window.createWebviewPanel('webview', 'Solid', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const nonce = getNonce()
    const contentSecurityPolicy = {
      'img-src': `vscode-resource: https: http: data:`,
      'script-src': `'nonce-${nonce}'`,
      'style-src': `vscode-resource: 'unsafe-inline' http: https: data:`,
    }

    const html = readFileSync(path.join(context.extensionPath, 'build', 'index.html'), 'utf8')
    const dom = createDom({
      panel,
      html,
      nonce,
      contentSecurityPolicy,
      basePath: path.join(context.extensionPath, 'build/'),
    })

    // // Serialize the document back to a string
    panel.webview.html = dom.serialize()

    callback(panel)
  })
  context.subscriptions.push(webview)
}

function createDevWebview(
  context: vscode.ExtensionContext,
  callback: (panel: vscode.WebviewPanel) => void,
  dev: DevConfig,
) {
  const webview = vscode.commands.registerCommand('solid-webview-dev.start', () => {
    const panel = vscode.window.createWebviewPanel('webview', 'Solid', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const nonce = getNonce()
    const origin = `${dev.location}:${dev.port}`
    const contentSecurityPolicy = {
      'img-src': `vscode-resource: https: http: data:`,
      'script-src': `'nonce-${nonce}'`,
      'style-src': `vscode-resource: 'unsafe-inline' http: https: data:`,
      'connect-src': `https://* http://${origin} http://0.0.0.0:${dev.port} ws://${origin} ws://0.0.0.0:${dev.port}`,
    }

    const html = readFileSync(path.join(context.extensionPath, 'index.html'), 'utf8')
    const dom = createDom({
      panel,
      html,
      nonce,
      contentSecurityPolicy,
      basePath: path.join(context.extensionPath, 'build/'),
    })
    const document = dom.window.document

    // Append script logging if the development server is accessible
    const loadLogScript = document.createElement('script')
    loadLogScript.setAttribute('nonce', nonce)
    loadLogScript.textContent = `
      fetch("http://${origin}").then(
        () => vscode.postMessage({
          command: 'dev:load',
          text: 'success',
        })
      ).catch(
        () => vscode.postMessage({
          command: 'dev:load',
          text: 'error',
        })
      )
    `
    document.head.appendChild(loadLogScript)

    panel.webview.html = dom.serialize()

    callback(panel)
  })
  context.subscriptions.push(webview)
}

function createDom({
  panel,
  html,
  nonce,
  basePath,
  contentSecurityPolicy,
}: {
  panel: vscode.WebviewPanel
  html: string
  nonce: string
  basePath: string
  contentSecurityPolicy: Record<string, string>
}) {
  // Parse the HTML string
  const dom = new JSDOM(html)
  const document = dom.window.document

  // Add base tag to head
  const base = document.createElement('base')
  base.setAttribute('href', panel.webview.asWebviewUri(vscode.Uri.file(basePath)) as unknown as string)
  document.head.prepend(base)

  document.querySelectorAll('script').forEach((script) => (script.nonce = nonce))

  // Add the Content-Security-Policy meta tag to the head
  const meta = document.createElement('meta')
  meta.setAttribute('http-equiv', 'Content-Security-Policy')
  meta.setAttribute('content', createContentSecurityPolicyString(contentSecurityPolicy))
  document.head.appendChild(meta)

  return dom
}

export function deactivate() {}
