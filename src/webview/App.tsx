import { getHighlighter } from 'shiki'
import { For, Index, Setter, createResource, createSignal, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import type { Files, UpdateAllConfig } from '~extension/types'
import styles from './App.module.css'
import { BreadCrumbs } from './components/breadcrumbs'
import { Comment as CommentComponent } from './components/comment'
import { SearchAndReplace } from './components/search-and-replace'
import { createIdFromPath } from './utils/create-id-from-path'

export default function App() {
  const [files, setFiles] = createStore<Files>([])
  const [theme, setTheme] = createSignal<string>() // Default theme
  const [isSearchAndReplaceOpened, setIsSearchAndReplaceOpened] = createSignal(false)
  const [basePath, setBasePath] = createSignal('')

  onMount(() => {
    window.addEventListener('message', (event) => {
      const message = event.data
      switch (message.command) {
        case 'setFiles':
          setFiles(reconcile(message.files))
          break
        case 'setTheme':
          setTheme(message.theme)
          break
        case 'setBasePath':
          setBasePath(message.basePath)
      }
    })
    window.vscode.postMessage({ command: 'initialize' })
  })

  function onUpdate(filePath: string, index: number, newComment: string) {
    setFiles(({ path }) => path === filePath, 'comments', index, 'source', newComment)
    window.vscode.postMessage({
      command: 'update',
      data: { filePath, index, comment: newComment },
    })
  }

  function onUpdateAll(data: UpdateAllConfig) {
    window.vscode.postMessage({
      command: 'updateAll',
      data,
    })
  }

  const openFileAtLine = (filePath: string, line: number) => {
    window.vscode.postMessage({
      command: 'openFileAtLine',
      data: { filePath, line },
    })
  }

  const [background] = createResource(theme, (theme) =>
    getHighlighter({ themes: [theme.toLowerCase()], langs: ['tsx'] })
      .then((highlighter) => highlighter.getTheme(theme?.toLowerCase()))
      .then((theme) => theme.bg),
  )

  function onSearchInputMount({
    replaceInput,
    searchInput,
    setSearchQuery,
  }: {
    replaceInput: HTMLInputElement
    searchInput: HTMLInputElement
    setSearchQuery: Setter<string>
  }) {
    function onKeyDown(e: KeyboardEvent) {
      const cmd = e.ctrlKey || e.metaKey
      switch (e.key) {
        case 'f':
          if (cmd) {
            setIsSearchAndReplaceOpened(true)
            const selection = window.getSelection()
            setSearchQuery(selection?.toString() || '')
            searchInput.focus()
            searchInput.select()
          }
          break
        case 'r':
          if (cmd) {
            setIsSearchAndReplaceOpened(true)
            replaceInput.focus()
            replaceInput.select()
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
  }

  return (
    <div class={styles.root} style={{ '--background-color': background() }}>
      <SearchAndReplace
        open={isSearchAndReplaceOpened()}
        files={files}
        onClose={() => setIsSearchAndReplaceOpened(false)}
        onUpdate={onUpdate}
        onUpdateAll={onUpdateAll}
        onMount={onSearchInputMount}
      />
      <div class={styles.comments}>
        <For each={files}>
          {(file) => (
            <div class={styles.file}>
              <h1>
                <BreadCrumbs breadcrumbs={file.relativePath.split('/')} />
              </h1>
              <Index each={file.comments}>
                {(comment, index) => (
                  <CommentComponent
                    id={`${createIdFromPath(file.path)}${index}`}
                    theme={theme()}
                    comment={comment()}
                    onUpdate={(value) => onUpdate(file.path, index, value)}
                    onOpenLine={() => openFileAtLine(file.path, comment().line)}
                  />
                )}
              </Index>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
