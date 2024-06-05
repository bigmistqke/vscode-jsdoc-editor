import type { CSP } from './types'

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
export function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function createCSPAttribute(config: CSP) {
  return Object.entries(config)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key} ${value.join(' ')};`
      }
      if (typeof value === 'boolean') {
        return `${key};`
      } else {
        return `${key} ${value};`
      }
    })
    .join(' ')
}
