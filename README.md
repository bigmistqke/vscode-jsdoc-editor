<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=vscode-webview-solid&background=tiles&project=%20" alt="vscode-webview-solid">
</p>

`vscode-webview-solid` is a starter for integrating a solid.js frontend with a VS Code extension.

It registers 2 webviews:

1. regular webview linking to the built output
2. developer webview with HMR linking to the vite developer server

## Table of Contents

- [Directory Structure](#directory-structure)
  - [src/extension/index.ts](#srcextensionindexts)
  - [src/extension/lib](#srcextensionlib)
  - [src/webview](#srcwebview)
- [Development](#development)
  - [Testing the Built Version](#testing-the-built-version)
  - [Testing the Development Version](#testing-the-development-version)

## Directory Structure

The project structure is organized as follows:

- src
  - extension
    - index.ts
    - lib
  - webview
    - index.tsx
    - App.tsx
    - ...

### src/extension/index.ts

This file contains business logic and configuration of the VS Code extension.

```typescript
import * as vscode from 'vscode'
import { type DevConfig, createActivate } from './lib'

const devConfig: DevConfig = {
  location: 'localhost',
  port: '6969',
  entry: 'src/webview/index.tsx',
}

export const activate = createActivate((panel: vscode.WebviewPanel) => {
  panel.webview.onDidReceiveMessage((message: any) => {
    const command = message.command
    const text = message.text
    switch (command) {
      case 'hello':
        vscode.window.showInformationMessage?.(text)
        return
      case 'dev:load':
        if (text === 'error') {
          vscode.window.showErrorMessage?.(
            `Unable to connect to development server: http://${devConfig.location}:${devConfig.port}`,
          )
        }
        return
    }
  })
}, devConfig)
```

### src/extension/lib

This directory contains utility functions for setting up the webviews of your VS Code extension and its integration with solid.js.

- `createActivate`: Accepts a callback function and a development configuration object, returning the `activate` function for the extension. `createActivate` will register both the regular webview (linking the built output) and the developer webview (linking to the vite developer server).
  - Parameters:
    - `callback`: A function that takes a `vscode.WebviewPanel` as an argument. This function is called when the webview is created and is where you set up message handling and other webview logic.
    - `devConfig`: An object of type `DevConfig` that contains development-specific settings such as location, port, and entry point.
  - Returns:
    - `activate`-function
- `DevConfig`-type
  - `location`: string - p.ex `localhost`
  - `port`: string - p.ex `6969`
  - `entry`: string - p.ex `src/webview/index.tsx`

### src/webview

This directory contains a typical solid.js project for the webview.

- `index.tsx`: Entry point for the solid.js application.
- `App.tsx`: Main component of the solid.js application.
- Additional files and directories typical of a solid.js project (e.g., styles, assets, components).

The `vscode` Webview API is exposed in the `window` object to allow communication between the webview and the VS Code extension.

```tsx
const App: Component = () => {
  function onClick() {
    window.vscode.postMessage({
      command: 'hello',
      text: 'Hey there partner! 🤠',
    })
  }
  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <button onClick={onClick}>hello</button>
      </header>
    </div>
  )
}
```

## Development

### Testing the Built Version

To test a built version of the project, follow these steps:

1. Build the project: `pnpm build`
2. Open (by pressing `F5`) or reload the VS Code Extension Development Host window.
3. Open the command palette in VS Code with `Cmd/Ctrl + P`.
4. Enter `> Start Solid Webview`.

Each time you make a change, you will need to repeat these steps.

### Testing the Development Version

To develop locally with hot module replacement (HMR), follow these steps:

1. Start the development server: `pnpm dev`
2. Open the VS Code Extension Development Host window by pressing `F5`.
3. Open the command palette in VS Code with `Cmd/Ctrl + P`.
4. Enter `> Start Solid Webview (Dev)`.
5. Any changes you make will automatically trigger hot module reloading.

If you change the entry point or the port, remember to adjust the `devConfig`-configuration in [`src/extension`](#srcextension) accordingly.

To avoid exporting the dev-mode command, remember to remove it from `package.json` when publishing your extension.
