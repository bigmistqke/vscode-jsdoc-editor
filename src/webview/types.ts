export type Comment = {
  source: string
  line: number
  range: vscode.Range
  target?: string
  breadcrumbs: string[]
}
