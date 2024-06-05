import { parse } from 'comment-parser'
import { Show, createEffect, createSignal } from 'solid-js'
import { ShikiTextarea } from '../solid-shiki-textarea'
import { type Comment } from '../types'
import { BreadCrumbs } from './breadcrumbs'
import styles from './comment.module.css'

export function getHighlightElement(id: string) {
  return document.getElementById(id)?.querySelector(`code.${styles.highlight}`)
}

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

  let valueBeforeFocus: string
  function onFocus() {
    valueBeforeFocus = source()
  }

  function onBlur() {
    const value = source()
    if (valueBeforeFocus === value) return
    if (validateComment(value)) {
      props.onUpdate(value)
      setError(undefined)
    } else {
      setError('Invalid JSDoc comment')
    }
  }

  return (
    <div class={styles.comment}>
      <div class={styles.header}>
        <h2>
          <BreadCrumbs breadcrumbs={props.comment.breadcrumbs} />
        </h2>
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
          onFocus={onFocus}
          onBlur={onBlur}>
          {(source) => <code class={styles.highlight}>{source()}</code>}
        </ShikiTextarea>
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}
