// https://unocss.dev/presets/attributify#typescript-support-jsx-tsx
import type {
  AttributifyAttributes,
  AttributifyNames,
} from 'unocss/preset-attributify'

type Prefix = 'u-' // change it to your prefix

declare global {
  interface PagefindHighlightInstance {
    highlight: () => void
  }

  interface Window {
    PagefindHighlight?: new (
      options: Record<string, unknown>,
    ) => PagefindHighlightInstance
    pagefindHighlight?: PagefindHighlightInstance
    pagefindHighlightPromise?: Promise<PagefindHighlightInstance | null>
    __pagefindHighlightListenerBound?: boolean
  }

  namespace astroHTML.JSX {
    interface HTMLAttributes
      extends
        AttributifyAttributes,
        Partial<Record<AttributifyNames<Prefix>, string>> {}
  }
}
