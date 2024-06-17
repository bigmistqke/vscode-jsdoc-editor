import { For, Show } from 'solid-js'
import { Codicon } from '~/solid-codicon'

export function BreadCrumbs(props: { breadcrumbs: string[] }) {
  return (
    <For each={props.breadcrumbs}>
      {(breadcrumb, index) => (
        <>
          <span>{breadcrumb}</span>
          <Show when={index() !== props.breadcrumbs.length - 1}>
            <Codicon kind="chevron-right" />
          </Show>
        </>
      )}
    </For>
  )
}
