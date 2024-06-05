type CSPDirectiveValues =
  | "'none'"
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | 'https:'
  | 'http:'
  | 'data:'
  | 'blob:'
  | (string & {})

export type CSP = {
  'base-uri'?: CSPDirectiveValues | CSPDirectiveValues[]
  'block-all-mixed-content'?: boolean
  'child-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'connect-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'default-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'font-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'form-action'?: CSPDirectiveValues | CSPDirectiveValues[]
  'frame-ancestors'?: CSPDirectiveValues | CSPDirectiveValues[]
  'frame-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'img-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'manifest-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'media-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'navigate-to'?: CSPDirectiveValues | CSPDirectiveValues[]
  'object-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'plugin-types'?: string | string[]
  'prefetch-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'report-to'?: string
  'report-uri'?: string
  'require-sri-for'?: 'script' | 'style' | string
  sandbox?: string | string[]
  'script-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'script-src-attr'?: CSPDirectiveValues | CSPDirectiveValues[]
  'script-src-elem'?: CSPDirectiveValues | CSPDirectiveValues[]
  'style-src'?: CSPDirectiveValues | CSPDirectiveValues[]
  'style-src-attr'?: CSPDirectiveValues | CSPDirectiveValues[]
  'style-src-elem'?: CSPDirectiveValues | CSPDirectiveValues[]
  'trusted-types'?: string | string[]
  'upgrade-insecure-requests'?: boolean
  'worker-src'?: CSPDirectiveValues | CSPDirectiveValues[]
}
