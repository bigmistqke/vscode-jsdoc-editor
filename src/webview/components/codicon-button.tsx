import { ComponentProps } from 'solid-js'
import { Codicon, CodiconKind } from '~/solid-codicon'
import { Button } from './button'

export function CodiconButton(
  props: Omit<ComponentProps<typeof Button>, 'type' | 'kind'> & { kind: CodiconKind; type?: 'bare' | 'default' },
) {
  return <Codicon {...props} as={Button} />
}
