import { getHighlighter } from 'shiki'
import { For, Index, Setter, createResource, createSignal, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import styles from './App.module.css'
import { Comment as CommentComponent } from './components/comment'
import { SearchAndReplace } from './components/search-and-replace'
import { type Comment } from './types'
import { getNameFromPath } from './utils/get-name-from-path'

export default function App() {
  const [comments, setComments] = createStore<Record<string, Comment[]>>({})
  const [theme, setTheme] = createSignal<string>() // Default theme
  const [isSearchAndReplaceOpened, setIsSearchAndReplaceOpened] = createSignal(false)

  onMount(() => {
    window.addEventListener('message', (event) => {
      const message = event.data
      console.log('received message', message)
      if (message.command === 'setComments') {
        window.vscode.setState({ comments: message.comments })
        setComments(reconcile(message.comments))
      } else if (message.command === 'setTheme') {
        setTheme(message.theme)
      }
    })
    window.vscode.postMessage({ command: 'initialize' })
  })

  const updateComment = (filePath: string, index: number, newComment: string) => {
    setComments(filePath, index, 'source', newComment)
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
            console.log('selection is ', selection?.toString())
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
        onClose={() => {
          console.log('this happens?')
          setIsSearchAndReplaceOpened(false)
        }}
        onUpdate={updateComment}
        onMount={onSearchInputMount}
      />
      <div class={styles.comments}>
        <For each={Object.keys(comments)}>
          {(filePath) => (
            <div class={styles.file}>
              <h1>{getNameFromPath(filePath)}</h1>
              <Index each={comments[filePath]}>
                {(comment, index) => (
                  <CommentComponent
                    id={`${getNameFromPath(filePath)}${index}`}
                    theme={theme()}
                    comment={comment()}
                    onUpdate={(value) => updateComment(filePath, index, value)}
                    onOpenLine={() => openFileAtLine(filePath, comment().line)}
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
