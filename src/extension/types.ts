import * as vscode from 'vscode'

export type Comment = { source: string; line: number; range: vscode.Range; target?: string; breadcrumbs: string[] }
export type File = { path: string; relativePath: string; comments: Comment[] }
