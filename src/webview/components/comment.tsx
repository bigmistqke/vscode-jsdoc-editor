import { parse } from 'comment-parser'
import { For, Show, createEffect, createSignal } from 'solid-js'
import { type Comment } from '../App'
import styles from '../App.module.css'
import { Codicon } from '../codicon/codicon'
import { ShikiTextarea } from '../solid-shiki-textarea'

export function Comment(props: {
  id: string
  comment: Comment
  theme?: string
  onUpdate: (value: string) => void
  onOpenLine: () => void
}) {
  const [source, setSource] = createSignal(props.comment.source)
  const [error, setError] = createSignal<string>()

  function validateComment(comment: string): boolean {
    try {
      const parsed = parse(comment)
      return parsed.length > 0
    } catch (e) {
      return false
    }
  }

  createEffect(() => setSource(props.comment.source))

  return (
    <div class={styles.comment}>
      <div class={styles.header}>
        <BreadCrumbs comment={props.comment} />
        <button onClick={props.onOpenLine}>Go to Line {props.comment.line}</button>
      </div>
      <div class={styles.textareaContainer}>
        <ShikiTextarea
          id={props.id}
          theme={props.theme?.toLowerCase()}
          class={styles.textarea}
          style={{ padding: '10px' }}
          value={source()}
          onInput={setSource}
          onBlur={() => {
            console.log('BLUR!')
            const value = source()
            if (validateComment(value)) {
              props.onUpdate(value)
              setError(undefined)
            } else {
              setError('Invalid JSDoc comment')
            }
          }}>
          {(source) => <code class={styles.highlight}>{source()}</code>}
        </ShikiTextarea>
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}

function BreadCrumbs(props: { comment: Comment }) {
  return (
    <h2 class={styles.breadcrumb}>
      <For each={props.comment.breadcrumbs}>
        {(breadcrumb, index) => (
          <>
            <span>{breadcrumb}</span>
            <Show when={index() !== props.comment.breadcrumbs.length - 1}>
              <Codicon type="chevron-right" />
            </Show>
          </>
        )}
      </For>
    </h2>
  )
}
