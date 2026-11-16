import { toggleFadeEffect } from '../utils/misc.ts'

interface SubResult {
  title: string
  url: string
  excerpt: string
  weighted_locations: { weight: number }[]
}

interface PagefindResult {
  data: () => Promise<{ meta?: { title?: string }; sub_results: SubResult[] }>
}

export interface PagefindApi {
  options: (options: Record<string, unknown>) => void | Promise<void>
  init: () => void | Promise<void>
  debouncedSearch: (
    query: string,
    options: { filters?: Record<string, string | string[]> },
    delay: number
  ) => Promise<{ results: PagefindResult[] } | null>
}

export function registerSearchPanel(
  importModule: (url: string) => Promise<PagefindApi> = (url) => import(/* @vite-ignore */ url)
) {
  let pagefindPromise: ReturnType<typeof importPagefind> | undefined

  async function importPagefind(url: string, navHighlight: boolean) {
    const pagefind = await importModule(url)
    await pagefind.options({
      excerptLength: 20,
      ...(navHighlight && { highlightParam: 'search' }),
      ranking: {
        termFrequency: 0.6,
        termSimilarity: 1.0,
        pageLength: 0.0,
        termSaturation: 1.4,
      },
    })
    await pagefind.init()
    return pagefind
  }

  function loadPagefind(url: string, navHighlight: boolean) {
    pagefindPromise ??= importPagefind(url, navHighlight).catch((error) => {
      pagefindPromise = undefined
      throw error
    })
    return pagefindPromise
  }

  const fakeResults = [
    {
      meta: {
        title: 'Simulated Search Result in Dev Env',
      },
      excerpt:
        'Mock data is used to simulate pagefind search <mark>in development</mark>, where files required for indexing exist only in memory.',
    },
    {
      meta: {
        title: 'Testing Search Functionality in Prod Env',
      },
      excerpt: 'Try running <mark>pnpm build && pnpm preview</mark> instead.',
    },
  ]

  class SearchPanel extends HTMLElement {
    #input: HTMLInputElement | null = null
    #label: HTMLLabelElement | null = null
    #results: HTMLElement | null = null
    #feedback: HTMLElement | null = null
    #content: HTMLElement | null = null
    #pagination: HTMLElement | null = null
    #btnMore: HTMLButtonElement | null = null
    #btnAll: HTMLButtonElement | null = null
    #selectedItem: HTMLAnchorElement | null = null

    #filter = this.dataset.filter === 'true'
    #tabs: HTMLElement[] = []
    #currentTab = 0

    #activeRequestId = 0
    #isComposing = false
    #production = this.dataset.production === 'true'
    #allResults: PagefindResult[] = []
    #renderedCount = 0
    #maxItems = this.dataset.maxItems
      ? parseInt(this.dataset.maxItems || '10', 10)
      : undefined

    #batchLoading = false
    #batchSize = this.dataset.batchSize
      ? parseInt(this.dataset.batchSize || '5', 10)
      : undefined

    connectedCallback() {
      this.#input = this.querySelector('#search-input')
      this.#label = this.querySelector('#search-label')
      this.#results = this.querySelector('#search-results')
      this.#feedback = this.querySelector('#search-feedback')
      this.#content = this.querySelector('#search-content')

      this.#initFilter()
      this.#initPagination()

      this.#input?.addEventListener('input', this.#handleInput)
      this.#input?.addEventListener('compositionstart', this.#handleCompositionStart)
      this.#input?.addEventListener('compositionend', this.#handleCompositionEnd)

      this.#content?.addEventListener('click', this.#handleResultClick)
      this.#content?.addEventListener(
        'pointerover',
        this.#handleResultsPointerOver
      )

      this.addEventListener('keydown', this.#handleResultsKeyDown)
    }

    disconnectedCallback() {
      this.#input?.removeEventListener('input', this.#handleInput)
      this.#input?.removeEventListener('compositionstart', this.#handleCompositionStart)
      this.#input?.removeEventListener('compositionend', this.#handleCompositionEnd)
      this.#isComposing = false

      this.#content?.removeEventListener('click', this.#handleResultClick)
      this.#content?.removeEventListener(
        'pointerover',
        this.#handleResultsPointerOver
      )

      this.removeEventListener('keydown', this.#handleResultsKeyDown)

      if (this.#filter) {
        for (const tab of this.#tabs) {
          tab.removeEventListener('keydown', this.#handleTabKeyDown)
          tab.replaceWith(tab.cloneNode(true))
        }
      }
      if (this.#batchSize) {
        this.#btnMore?.removeEventListener('click', this.#handlePaginateClick)
        this.#btnAll?.removeEventListener('click', this.#handlePaginateClick)
      }

      this.#activeRequestId++
    }

    #initFilter = () => {
      if (!this.#filter) {
        this.#updateHint()
        return
      }

      this.#tabs = Array.from(this.querySelectorAll('[role="tab"]'))
      let storedTab = 0
      try {
        storedTab = Number(localStorage.getItem('search-tab'))
      } catch {
        // Search remains usable when browser storage is unavailable.
      }
      this.#currentTab = Number.isInteger(storedTab) && storedTab >= 0 && storedTab < this.#tabs.length
        ? storedTab
        : 0
      for (let i = 0; i < this.#tabs.length; i++) {
        const isSelected = i === this.#currentTab
        this.#tabs[i].setAttribute('aria-selected', isSelected.toString())
        this.#tabs[i].setAttribute('tabindex', isSelected ? '0' : '-1')
        if (isSelected) this.#results?.setAttribute('aria-labelledby', this.#tabs[i].id)
        if (isSelected) this.#updateHint(this.#tabs[i].dataset.label)

        this.#tabs[i].addEventListener('click', () => this.#activateTab(i))
        this.#tabs[i].addEventListener('keydown', this.#handleTabKeyDown)
      }
    }

    #initPagination = () => {
      if (!this.#batchSize) return

      this.#pagination = this.querySelector('#search-pagination')
      this.#btnMore = this.querySelector('[data-action="more"]')
      this.#btnAll = this.querySelector('[data-action="all"]')

      this.#btnMore?.addEventListener('click', this.#handlePaginateClick)
      this.#btnAll?.addEventListener('click', this.#handlePaginateClick)
    }

    #handleCompositionStart = () => {
      this.#isComposing = true
      this.#activeRequestId++
      this.#resetView()
    }

    #handleCompositionEnd = (event: CompositionEvent) => {
      this.#isComposing = false
      void this.#handleInput(event)
    }

    #handleInput = async (event: Event) => {
      if (this.#isComposing || (event as InputEvent).isComposing || !this.#content) return
      const value = (event.target as HTMLInputElement).value.trim()
      const requestId = ++this.#activeRequestId
      this.#resetView()
      if (value.length === 0) return

      if (this.#production && this.dataset.emptyIndex === 'true') {
        this.#showOnlyNoResult(requestId)
        return
      }

      try {
        this.#showLoading(requestId)
        let res: { results: PagefindResult[] } | null
        if (this.#production) {
          const options: { filters?: Record<string, string | string[]> } = {}
          if (this.#filter && this.#tabs[this.#currentTab]) {
            const type = this.#tabs[this.#currentTab].dataset.type
            if (type) options.filters = { collection: type }
          }
          const url = this.dataset.pagefindUrl
          if (!url) throw new Error('Search index URL is missing')
          const pagefind = await loadPagefind(url, this.dataset.navHighlight === 'true')
          if (requestId !== this.#activeRequestId) return
          res = await pagefind.debouncedSearch(value, options, 300)
        } else {
          res = { results: fakeResults.map((result) => ({
            data: async () => ({
              meta: result.meta,
              sub_results: [{
                title: result.meta.title,
                url: this.#results?.dataset.base || '/',
                excerpt: result.excerpt,
                weighted_locations: [],
              }],
            }),
          })) }
        }
        if (res === null || requestId !== this.#activeRequestId) return
        if (res.results.length === 0) {
          this.#showOnlyNoResult(requestId)
          return
        }
        this.#allResults = res.results
        await this.#render({ requestId })
      } catch (_err) {
        this.#showOnlyError(requestId)
      }
    }

    #handleResultClick = (event: MouseEvent) => {
      if (!this.#getLink(event)) return

      toggleFadeEffect('search-panel', false, 'hidden')
      toggleFadeEffect('backdrop', false, 'hidden')
    }

    #handleResultsPointerOver = (event: MouseEvent) => {
      const link = this.#getLink(event)
      if (!link) return

      this.#selectItem(link)
    }

    #handleResultsKeyDown = (event: KeyboardEvent) => {
      if (this.#isComposing || event.isComposing || event.keyCode === 229) return
      if (!this.#selectedItem || document.activeElement !== this.#input) return

      const key = event.key
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') return

      event.preventDefault()

      if (key === 'Enter') {
        this.#selectedItem.click()
        return
      }

      const items = Array.from(this.#content?.querySelectorAll<HTMLAnchorElement>('[role="option"]') ?? [])
      const index = items.indexOf(this.#selectedItem)
      const step = key === 'ArrowDown' ? 1 : -1
      const target = items[(index + step + items.length) % items.length]

      if (target) {
        this.#selectItem(target)
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    #updateHint = (label = '') => {
      const hint = label ? `Search ${label}` : 'Search'
      if (this.#input) this.#input.placeholder = hint
      if (this.#label) this.#label.textContent = hint
    }

    #handleTabKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !this.#tabs.length) return
      const index = this.#tabs.indexOf(event.currentTarget as HTMLElement)
      let next: number
      if (event.key === 'ArrowRight') next = (index + 1) % this.#tabs.length
      else if (event.key === 'ArrowLeft') next = (index - 1 + this.#tabs.length) % this.#tabs.length
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = this.#tabs.length - 1
      else return

      event.preventDefault()
      void this.#activateTab(next, false)
      this.#tabs[next].focus()
    }

    #activateTab = async (idx: number, focusInput = true) => {
      if (idx === this.#currentTab) return

      this.#tabs[this.#currentTab]?.setAttribute('aria-selected', 'false')
      this.#tabs[this.#currentTab]?.setAttribute('tabindex', '-1')
      this.#tabs[idx]?.setAttribute('aria-selected', 'true')
      this.#tabs[idx]?.setAttribute('tabindex', '0')
      this.#results?.setAttribute('aria-labelledby', this.#tabs[idx].id)

      this.#currentTab = idx
      try {
        localStorage.setItem('search-tab', idx.toString())
      } catch {
        // Persistence is optional; category switching is not.
      }

      this.#updateHint(this.#tabs[idx]?.dataset.label)

      if (this.#input?.value) {
        this.#resetView()
        if (focusInput) this.#input.focus()
        await this.#handleInput({ target: this.#input } as unknown as Event)
      }
    }

    #handlePaginateClick = async (ev: MouseEvent) => {
      const btn = ev.currentTarget as HTMLButtonElement
      if (!btn || this.#batchLoading) return

      const requestId = this.#activeRequestId

      const action = btn.dataset.action
      if (action === 'more' || action === 'all') {
        this.#input?.focus()
        await this.#render({ requestId, next: true, all: action === 'all' })
      }
    }

    #render = async ({
      requestId,
      next = false,
      all = false,
    }: {
      requestId: number
      next?: boolean
      all?: boolean
    }) => {
      if (!this.#content) return
      if (requestId !== this.#activeRequestId) return
      if (this.#batchSize && this.#batchLoading) return

      try {
        const start = this.#renderedCount
        const end =
          !this.#batchSize || all
            ? this.#allResults.length
            : Math.min(start + this.#batchSize, this.#allResults.length)

        if (next) this.#showLoading(requestId, true)

        const slice = this.#allResults.slice(start, end)
        const settled = await Promise.allSettled(slice.map((r) => r.data()))
        if (requestId !== this.#activeRequestId) return
        const fulfilled = settled.filter((s) => s.status === 'fulfilled')
        if (fulfilled.length === 0) {
          this.#showOnlyError(requestId)
          return
        }

        const frag = document.createDocumentFragment()
        for (let r = 0; r < fulfilled.length; r++) {
          if (requestId !== this.#activeRequestId) return
          const data = fulfilled[r].value

          const group = document.createElement('div')
          group.setAttribute('role', 'group')
          group.setAttribute('aria-label', data.meta?.title ?? '')
          const h1 = document.createElement('div')
          h1.className = 'search-result-h1'
          h1.setAttribute('aria-hidden', 'true')
          h1.textContent = data.meta?.title ?? ''
          group.appendChild(h1)

          let subResults = data.sub_results
          if (this.#maxItems)
            subResults = this.#sortSubResults(subResults, this.#maxItems)

          for (let s = 0; s < subResults.length; s++) {
            const a = document.createElement('a')
            a.href = subResults[s].url
            a.id = `search-result-${requestId}-${start + r}-${s}`
            a.className = 'search-result-item'
            a.setAttribute('role', 'option')
            a.setAttribute('tabindex', '-1')

            if (!this.#selectedItem) {
              this.#selectItem(a)
            } else {
              a.setAttribute('aria-selected', 'false')
            }

            const title = document.createElement('div')
            title.className = 'search-result-title'
            title.textContent = subResults[s].title
            const excerpt = document.createElement('div')
            excerpt.className = 'search-result-excerpt'
            excerpt.innerHTML = subResults[s].excerpt
            a.append(title, excerpt)
            group.appendChild(a)
          }
          frag.appendChild(group)
        }

        if (requestId !== this.#activeRequestId) return
        this.#showFeedback('')
        this.#content.appendChild(frag)
        this.#input?.setAttribute('aria-expanded', String(Boolean(this.#selectedItem)))
        if (!next) {
          this.#selectedItem?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }

        if (this.#batchSize) {
          this.#renderedCount = end
          const hasMore = this.#renderedCount < this.#allResults.length
          this.#showPagination(hasMore)
        }
      } catch (_err) {
        this.#showOnlyError(requestId)
      } finally {
        if (requestId === this.#activeRequestId) {
          this.#results?.removeAttribute('aria-busy')
          if (this.#batchSize) this.#batchLoading = false
        }
      }
    }

    #sortSubResults = (data: SubResult[], maxItems: number) => {
      return data
        .toSorted((a, b) => {
          const aWeightedCount = a.weighted_locations.length
          const bWeightedCount = b.weighted_locations.length
          if (aWeightedCount !== bWeightedCount) {
            return bWeightedCount - aWeightedCount
          }
          const aAvgWeight =
            a.weighted_locations.reduce((sum, loc) => sum + loc.weight, 0) /
            (aWeightedCount || 1)
          const bAvgWeight =
            b.weighted_locations.reduce((sum, loc) => sum + loc.weight, 0) /
            (bWeightedCount || 1)
          return bAvgWeight - aAvgWeight
        })
        .slice(0, maxItems)
    }

    #resetView = () => {
      this.#content?.replaceChildren()
      this.#showFeedback('')
      this.#input?.setAttribute('aria-expanded', 'false')
      this.#input?.removeAttribute('aria-activedescendant')
      this.#results?.removeAttribute('aria-busy')

      this.#allResults = []
      this.#renderedCount = 0
      this.#selectedItem = null

      if (this.#batchSize) {
        this.#batchLoading = false
        this.#showPagination(false)
      }
    }

    #showFeedback = (feedback: string) => {
      if (!this.#feedback) return
      if (feedback) this.#feedback.textContent = feedback
      this.#feedback.classList.toggle('hidden', !feedback)
    }

    #showLoading = (requestId: number, next = false) => {
      if (requestId !== this.#activeRequestId) return

      if (next) {
        this.#showPagination(false)
        this.#batchLoading = true
      }
      this.#showFeedback('Loading...')
      this.#results?.setAttribute('aria-busy', 'true')
    }

    #showOnlyError = (requestId: number) => {
      if (requestId !== this.#activeRequestId) return

      this.#showFeedback('Oops! Something went wrong. Try again.')
      this.#results?.removeAttribute('aria-busy')
    }

    #showOnlyNoResult = (requestId: number) => {
      if (requestId !== this.#activeRequestId) return

      this.#showFeedback('No results found.')
      this.#results?.removeAttribute('aria-busy')
    }

    #showPagination = (show: boolean) => {
      if (!this.#pagination || !this.#batchSize) return

      const all = this.#allResults.length
      const more = Math.min(this.#batchSize, all - this.#renderedCount)

      if (this.#btnMore)
        this.#btnMore.querySelector('span')!.textContent = `More +${more}`
      if (this.#btnAll)
        this.#btnAll.querySelector('span')!.textContent = `All ${all}`

      this.#pagination.style.display = show ? 'flex' : 'none'
    }

    #getLink = (event: Event) => {
      return event.target instanceof HTMLElement && event.target.closest('a')
    }

    #selectItem = (next: HTMLAnchorElement) => {
      this.#selectedItem?.setAttribute('aria-selected', 'false')
      this.#selectedItem = next
      next.setAttribute('aria-selected', 'true')
      this.#input?.setAttribute('aria-activedescendant', next.id)
    }
  }

  if (!customElements.get('search-panel'))
    customElements.define('search-panel', SearchPanel)

}
