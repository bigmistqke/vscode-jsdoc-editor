export function isSingleLine(comment: string) {
  return comment.split('\n').length === 1 && /^\/\*\*(.*)\*\/$/.test(comment)
}
