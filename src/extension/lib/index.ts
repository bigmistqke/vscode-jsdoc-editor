import * as path from 'path'
import * as vscode from 'vscode'
import { createCspString, getNonce, getUriFromRelativePathFactory } from './utils'

export type Config = {
  dev: {
    location: string
    port: string
    entry: string
  }
}

export function createWebviews(callback: (panel: vscode.WebviewPanel) => void, config: Config) {
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
  callback: (panel: vscode.WebviewPanel) => void,
  config: Config,
) {
  const webview = vscode.commands.registerCommand('solid-webview.start', () => {
    let panel = vscode.window.createWebviewPanel('webview', 'Solid', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const getUriFromRelativePath = getUriFromRelativePathFactory(context, panel)

    const manifest = require(path.join(context.extensionPath, 'build', '.vite', 'manifest.json'))['index.html']
    const js = getUriFromRelativePath('build', manifest.file)
    const css = (manifest.css as string[]).map((path) => getUriFromRelativePath('build', path))

    const nonce = getNonce()

    const csp = {
      'img-src': `vscode-resource: https: http: data:`,
      'script-src': `'nonce-${nonce}'`,
      'style-src': `vscode-resource: 'unsafe-inline' http: https: data:`,
    }

    panel.webview.html = /* html */ `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Security-Policy" content="${createCspString(csp)}">
          ${css.map((path) => `<link rel="stylesheet" type="text/css" href="${path}"></link>`)}
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${js}"></script>
        </body>
      </html>
    `

    callback(panel)
  })
  context.subscriptions.push(webview)
}

function createDevWebview(
  context: vscode.ExtensionContext,
  callback: (panel: vscode.WebviewPanel) => void,
  { dev }: Config,
) {
  const webview = vscode.commands.registerCommand('solid-webview-dev.start', () => {
    const panel = vscode.window.createWebviewPanel('webview', 'Solid', vscode.ViewColumn.One, {
      enableScripts: true,
    })

    const nonce = getNonce()
    const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(context.extensionPath))

    const origin = `${dev.location}:${dev.port}`
    const js = `http://${origin}/${dev.entry}`

    const csp = {
      'img-src': `vscode-resource: https: http: data:`,
      'script-src': `'nonce-${nonce}'`,
      'style-src': `vscode-resource: 'unsafe-inline' http: https: data:`,
      'connect-src': `https://* http://${origin} http://0.0.0.0:${dev.port} ws://${origin} ws://0.0.0.0:${dev.port}`,
    }

    panel.webview.html = /* html */ `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Security-Policy" content="${createCspString(csp)}">
          <base href="${baseUri}/" />
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script nonce="${nonce}">
            if (typeof acquireVsCodeApi === 'function') {
              window.vscode = acquireVsCodeApi()
            }
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
          </script>
          <script type="module" nonce="${nonce}" src="${js}"></script>
          <script nonce="${nonce}">
            /**
            * Vite doesn't offer a method to set the base URL in development mode.
            * For more information, see https://github.com/vitejs/vite/issues/11142
            * 
            * When local assets are imported, such as 'import svg from "./test.svg"',
            * they resolve to '/relative/path' during development. 
            * To ensure these imports reference the correct paths,
            * we adjust the image paths from '/relative/path' to './relative/path'.
            */
            function patchSources() {
              // Function to adjust image paths
              function adjustImagePaths(nodes) {
                nodes.forEach(node => {
                  if (node.nodeType === 1) {
                    if (node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'SOURCE') {
                      let src = node.getAttribute('src');
                      if (src && src.startsWith('/src') && !src.startsWith('./src')) {
                        node.setAttribute('src', '.' + src);
                      }
                    } else if (node.hasChildNodes()) {
                      adjustImagePaths(node.childNodes);
                    }
                  }
                });
              }

              // Function to adjust a single node's image path if needed
              function adjustImagePath(node) {
                if (node.nodeType === 1 && (node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'SOURCE')) {
                  let src = node.getAttribute('src');
                  if (src && src.startsWith('/src')) {
                    node.setAttribute('src', '.' + src);
                  }
                }
              }

              // Initial adjustment for existing images
              adjustImagePaths(document.body.childNodes);

              // MutationObserver to adjust paths for new images and attribute changes
              const observer = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                  if (mutation.type === 'childList') {
                    adjustImagePaths(mutation.addedNodes);
                  } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    adjustImagePath(mutation.target);
                  }
                }
              });

              observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
            }

            patchSources();

          </script>
        </body>
      </html>
    `

    callback(panel)
  })
  context.subscriptions.push(webview)
}

export function deactivate() {}
