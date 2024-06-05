import { RegexConfig } from '../types'
import { escapeRegex } from './escape-regex'

export function composeRegex({ query, isRegex, isWholeWord, isCaseSensitive }: RegexConfig) {
  let string = isRegex ? query : escapeRegex(query)

  if (isWholeWord) {
    string = `\\b${string}\\b`
  }

  return new RegExp(string, `g${isCaseSensitive ? '' : 'i'}`)
}
