<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=vscode-webview-solid&background=tiles&project=%20" alt="vscode-webview-solid">
</p>

`vscode-webview-solid` is a starter for integrating a Solid.js frontend with a VS Code extension.

## Table of Contents

- [Directory Structure](#directory-structure)
  - [src/extension](#srcextension)
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

### src/extension

This directory contains the VS Code extension activation logic and configuration.

- `index.ts`: The main entry point for the VS Code extension. Here, you can add your commands and manage the state.

```typescript
import * as vscode from 'vscode'
import { Config, createWebviews } from './lib'

const config: Config = {
  dev: {
    location: 'localhost',
    port: '6969',
    entry: 'src/webview/index.tsx',
  },
}

export const activate = createWebviews((panel: vscode.WebviewPanel) => {
  panel.webview.onDidReceiveMessage((message: any) => {
    const command = message.command
    const text = message.text
    switch (command) {
      case 'hello':
        vscode.window.showInformationMessage?.(text)
        return
    }
  })
}, config)
```

### src/webview

This directory contains a typical Solid.js project for the webview.

- `index.tsx`: Entry point for the Solid.js application.
- `App.tsx`: Main component of the Solid.js application.
- Additional files and directories typical of a Solid.js project (e.g., styles, assets, components).

### src/webview

This directory contains a typical Solid.js project for the webview.

- `index.tsx`: Entry point for the Solid.js application.
- `App.tsx`: Main component of the Solid.js application.
- Additional files and directories typical of a Solid.js project (e.g., styles, assets, components).

The `vscode` Webview API is exposed in the `window` object to allow communication between the webview and the VS Code extension.

````tsx
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
2. Open the VS Code Extension Development Host window by pressing `F5`.
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

If you change the entry point or the port, remember to adjust the configuration in `src/extension/index.ts` accordingly.

To avoid exporting the dev-mode command, remember to remove it from `package.json` when publishing your extension.
````
