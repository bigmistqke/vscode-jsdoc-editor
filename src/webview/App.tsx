import { getHighlighter } from 'shiki'
import { For, Index, Setter, createResource, createSignal, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import styles from './App.module.css'
import { BreadCrumbs } from './components/breadcrumbs'
import { Comment as CommentComponent } from './components/comment'
import { SearchAndReplace } from './components/search-and-replace'
import { Files } from './types'
import { getNameFromPath } from './utils/get-name-from-path'

export default function App() {
  const [comments, setComments] = createStore<Files>([])
  const [theme, setTheme] = createSignal<string>() // Default theme
  const [isSearchAndReplaceOpened, setIsSearchAndReplaceOpened] = createSignal(false)
  const [basePath, setBasePath] = createSignal('')

  onMount(() => {
    window.addEventListener('message', (event) => {
      const message = event.data
      switch (message.command) {
        case 'setComments':
          window.vscode.setState({ comments: message.comments })
          setComments(reconcile(message.comments))
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

  const updateComment = (filePath: string, index: number, newComment: string) => {
    setComments(({ path }) => path === filePath, 'comments', index, 'source', newComment)
    window.vscode.postMessage({
      command: 'updateComment',
      data: { filePath, index, comment: newComment },
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
        comments={comments}
        onClose={() => setIsSearchAndReplaceOpened(false)}
        onUpdate={updateComment}
        onMount={onSearchInputMount}
      />
      <div class={styles.comments}>
        <For each={comments}>
          {(file) => (
            <div class={styles.file}>
              <h1>
                <BreadCrumbs breadcrumbs={file.relativePath.split('/')} />
              </h1>
              <Index each={file.comments}>
                {(comment, index) => (
                  <CommentComponent
                    id={`${getNameFromPath(file.relativePath)}${index}`}
                    theme={theme()}
                    comment={comment()}
                    onUpdate={(value) => updateComment(file.path, index, value)}
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
