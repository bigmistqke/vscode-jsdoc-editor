import { parse } from 'comment-parser'
import { codeToHast } from 'shiki/index.mjs'
import { Show, createResource, createSignal, onMount } from 'solid-js'
import { HastTextarea } from '~/components/hast-textarea'
import { composeComment } from '~/utils/compose-comment'
import { formatHastToMatchText } from '~/utils/format-hast-to-match-text'
import { CleanedComment } from '~extension/types'
import { BreadCrumbs } from './breadcrumbs'
import { Button } from './button'
import styles from './comment.module.css'

export function getHighlightElement(id: string) {
  return document.getElementById(id)?.querySelector(`code.${styles.highlight}`)
}

const observerMap = new Map<Element, () => void>()

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observerMap.get(entry.target)?.()
      }
    })
  },
  {
    root: null, // Defaults to the browser viewport if not specified
    rootMargin: '0px',
    threshold: 0.1, // Adjust this value according to when you want to trigger the event
  },
)

function validateSource(source: string): boolean {
  try {
    const parsed = parse(source)
    return parsed.length > 0
  } catch (e) {
    return false
  }
}

export function Comment(props: {
  id: string
  comment: CleanedComment
  theme?: string
  onInput: (value: string) => void
  onOpenLine: () => void
  onUpdateFile: () => void
}) {
  let container: HTMLDivElement
  const [error, setError] = createSignal<string>()
  const [initialised, setInitialised] = createSignal(false)

  // Transform source to hast (hypertext abstract syntax tree)
  const [hast] = createResource(
    () => [initialised(), props.comment.source, props.comment.cleanedSource, props.theme] as const,
    async ([initialised, source, cleanedSource, theme]) => {
      if (!initialised || !theme || !source) return undefined
      const hast = await codeToHast(source, { lang: 'tsx', theme })
      return await formatHastToMatchText(hast, cleanedSource)
    },
  )

  let commentBeforeFocus = ''
  function onFocus() {
    commentBeforeFocus = props.comment.source
  }
  function onBlur() {
    const comment = props.comment.source
    if (commentBeforeFocus === comment) return
    if (validateSource(comment)) {
      setError(undefined)
      props.onUpdateFile()
    } else {
      setError('Invalid JSDoc comment')
    }
  }

  function onInput(comment: string) {
    props.onInput(composeComment(comment, props.comment.indentation))
  }

  onMount(() => {
    observerMap.set(container, () => {
      setInitialised(true)
      observer.unobserve(container)
      observerMap.delete(container)
      // cleanup observer once all containers have been observed
      if (observerMap.size === 0) {
        observer.disconnect()
      }
    })
    observer.observe(container)
  })

  return (
    <div class={styles.comment} ref={container!}>
      <div class={styles.header}>
        <h2>
          <BreadCrumbs breadcrumbs={props.comment.breadcrumbs} />
        </h2>
        <Button onClick={props.onOpenLine}>Go to Line {props.comment.line}</Button>
      </div>
      <div class={styles.textareaContainer}>
        <HastTextarea
          class={styles.textarea}
          hast={(hast() || hast.latest)?.children?.[0]?.children[0]}
          id={props.id}
          onBlur={onBlur}
          onFocus={onFocus}
          onInput={onInput}
          overlay={<code class={styles.highlight}>{props.comment.cleanedSource}</code>}
          style={{ padding: '10px' }}
          theme={props.theme?.toLowerCase()}
          value={props.comment.cleanedSource}
        />
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}
