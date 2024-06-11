import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import * as path from 'path'
import * as vscode from 'vscode'
import type { CSP } from './types'
import { createCSPAttribute, getNonce } from './utils'

export type Config = {
  csp: CSP
  dev: {
    location: string
    port: string
    entry: string
    csp?: CSP
  }
}

export function createActivate(
  callback: (panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => void,
  config: Config,
) {
  return function activate(context: vscode.ExtensionContext) {
    const isDev = context.extensionMode === vscode.ExtensionMode.Development
    if (isDev) {
      createDevWebview(context, callback, config)
    }
    createWebview(context, callback, config)
  }
}

function createWebview(
  context: vscode.ExtensionContext,
  callback: (panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => void,
  config: Config,
) {
  const webview = vscode.commands.registerCommand('jsdoc-editor.start', () => {
    const panel = vscode.window.createWebviewPanel('webview', 'Jsdoc Editor', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const nonce = getNonce()
    const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'build/')))
    const csp = {
      ...config.csp,
      'script-src': [...(config.csp['script-src'] || []), `'nonce-${nonce}'`],
    }
    const html = readFileSync(path.join(context.extensionPath, 'build', 'index.html'), 'utf8')
    const dom = createDom({
      html,
      nonce,
      csp,
      basePath: baseUri as unknown as string,
    })

    panel.webview.html = dom.serialize()
    callback(panel, context)
  })
  context.subscriptions.push(webview)
}

function createDevWebview(
  context: vscode.ExtensionContext,
  callback: (panel: vscode.WebviewPanel, context: vscode.ExtensionContext) => void,
  config: Config,
) {
  const webview = vscode.commands.registerCommand('jsdoc-editor-dev.start', () => {
    const panel = vscode.window.createWebviewPanel('webview', 'Jsdoc Editor', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const nonce = getNonce()
    const origin = `${config.dev.location}:${config.dev.port}`
    const configCsp = config.dev.csp || config.csp
    const csp = {
      ...configCsp,
      'script-src': [...(configCsp['script-src'] || []), `'nonce-${nonce}'`],
      'connect-src': [
        ...(configCsp['connect-src'] || []),
        `http://${origin}`,
        `http://0.0.0.0:${config.dev.port}`,
        `ws://${origin}`,
        `ws://0.0.0.0:${config.dev.port}`,
      ],
    }
    const html = readFileSync(path.join(context.extensionPath, 'index.html'), 'utf8')
    const dom = createDom({
      html,
      nonce,
      csp,
      basePath: `http://${origin}`,
    })
    const document = dom.window.document

    // Append script logging if the development server is accessible
    const loadLogScript = document.createElement('script')
    loadLogScript.setAttribute('nonce', nonce)
    loadLogScript.textContent = `
      fetch("http://${origin}").then(
        () => vscode.postMessage({
          command: 'dev:load',
          data: 'success',
        })
      ).catch(
        () => vscode.postMessage({
          command: 'dev:load',
          data: 'error',
        })
      )
    `
    document.head.appendChild(loadLogScript)

    panel.webview.html = dom.serialize()
    callback(panel, context)
  })
  context.subscriptions.push(webview)
}

function createDom({ html, nonce, basePath, csp }: { html: string; nonce: string; basePath: string; csp: CSP }) {
  // Parse the HTML string
  const dom = new JSDOM(html)
  const document = dom.window.document
  const cspAttribute = createCSPAttribute(csp)

  // Add base tag to head
  const base = document.createElement('base')
  base.setAttribute('href', basePath)
  document.head.prepend(base)

  document.querySelectorAll('script').forEach((script) => (script.nonce = nonce))

  // Add the Content-Security-Policy meta tag to the head
  const meta = document.createElement('meta')
  meta.setAttribute('http-equiv', 'Content-Security-Policy')
  meta.setAttribute('content', cspAttribute)
  document.head.appendChild(meta)

  return dom
}

export function deactivate() {}
