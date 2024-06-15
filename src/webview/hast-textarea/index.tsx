import { List } from '@solid-primitives/list'
import clsx from 'clsx'
import { codeToHast, type BundledTheme, type CodeOptionsSingleTheme } from 'shiki'
import { ComponentProps, Index, Show, createEffect, createSignal, onCleanup, useTransition, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Parent } from 'unist'
import { whenever } from './utils/conditionals'
import { processProps } from './utils/process-props'

import styles from './hast-textarea.module.css'

type Root = Awaited<ReturnType<typeof codeToHast>>
type Theme = CodeOptionsSingleTheme<BundledTheme>['theme']
type HastNode = Root['children'][number]
type Dimensions = {
  width: number
  height: number
}

/** Get the longest line-size of a given string */
const calculateMaxCharCount = (source: string) => {
  let maximumLineSize = -Infinity
  source.split('\n').forEach((line) => {
    if (line.length > maximumLineSize) {
      maximumLineSize = line.length
    }
  })
  return maximumLineSize
}

/** A textarea with syntax highlighting capabilities powered by [shiki](https://github.com/shikijs/shiki). */
export function HastTextarea(
  props: Omit<ComponentProps<'div'>, 'style' | 'onInput' | 'children' | 'onFocus' | 'onBlur'> &
    Pick<ComponentProps<'textarea'>, 'onFocus' | 'onBlur'> & {
      hast?: Parent
      lineCount?: number
      /** Custom CSS properties to apply to the editor. */
      style?: JSX.CSSProperties
      /** The source code to be displayed and edited. */
      value: string
      /** The default source code to initialize the editor with. */
      defaultValue?: string
      /** The theme to apply for syntax highlighting. */
      theme?: Theme
      /** Callback function to handle updates to the source code. */
      onInput?: (source: string) => void
      /** The programming language of the source code for syntax highlighting. */
      lang?: string
      overlay?: JSX.Element
    },
) {
  const [config, rest] = processProps(props, { lang: 'tsx', theme: 'min-light' }, [
    'class',
    'defaultValue',
    'lang',
    'onInput',
    'value',
    'style',
    'theme',
    'onBlur',
    'onFocus',
  ])
  const [characterDimensions, setCharacterDimensions] = createSignal<Dimensions>({
    width: 0,
    height: 0,
  })
  const [, startTransition] = useTransition()

  const maxCharCount = () => calculateMaxCharCount(config.value)
  const lineCount = () => props.lineCount || config.value.split('\n').length

  return (
    <div
      class={clsx(styles.editor, config.class)}
      style={{
        ...config.style,
        '--line-count': lineCount(),
        '--max-char-count': maxCharCount(),
        '--char-width': characterDimensions().width,
        '--char-height': characterDimensions().height,
      }}
      {...rest}>
      <div class={styles.container}>
        <textarea
          inputmode="none"
          autocomplete="off"
          spellcheck={false}
          class={clsx(styles.textarea, props.hast && styles.hasHast)}
          onInput={({ currentTarget: { value } }) => {
            // Update source with startTransition so Suspense is not triggered.
            startTransition(() => config.onInput?.(value))
          }}
          onBlur={config.onBlur}
          onFocus={config.onFocus}
          value={config.value}
        />
        <code class={styles.shiki}>
          <List each={props.hast?.children}>{(line) => <HastNode node={line()} />}</List>
        </code>
        {props.overlay}
        <CharacterDimensions onResize={setCharacterDimensions} />
      </div>
    </div>
  )
}

function HastNode(props: { node: any }) {
  return (
    <Show when={props.node.type !== 'text' && props.node} fallback={props.node.value}>
      {(node) => (
        <Dynamic component={node().tagName || 'div'} {...node().properties}>
          <Index each={node().children}>{(child) => <HastNode node={child()} />}</Index>
        </Dynamic>
      )}
    </Show>
  )
}

function CharacterDimensions(props: { onResize: (dimension: Dimensions) => void }) {
  const [character, setCharacter] = createSignal<HTMLElement>(null!)

  createEffect(
    whenever(character, (character) => {
      const resizeObserver = new ResizeObserver(() => {
        const { width, height } = character.getBoundingClientRect()
        props.onResize({ width, height })
      })
      resizeObserver.observe(character)
      onCleanup(() => resizeObserver.disconnect())
    }),
  )

  return <code ref={setCharacter} class={styles.character} innerText="m" aria-hidden />
}
