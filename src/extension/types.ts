import * as vscode from 'vscode'

export interface Comment {
  source: string
  line: number
  range: vscode.Range
  target?: string
  breadcrumbs: string[]
  indentation: string
}
export interface CleanedComment extends Comment {
  cleanedSource: string
}

export interface File {
  path: string
  relativePath: string
  comments: Comment[]
  modified: number
}

export interface CleanedFile extends File {
  comments: CleanedComment[]
}

export type RegexConfig = { query: string; isRegex: boolean; isWholeWord: boolean; isCaseSensitive: boolean }
export type UpdateAllConfig = { search: RegexConfig; replace: string }
