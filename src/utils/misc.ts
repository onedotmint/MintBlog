/**
 * Locks the scroll position of the document.
 */
export function lockScroll() {
  const bodyEl = document.body

  const scrollbarWidth = window.innerWidth - bodyEl.clientWidth
  const hasRose = document.getElementById('bg-rose')
  if (scrollbarWidth > 0 && !hasRose)
    bodyEl.style.paddingRight = `${scrollbarWidth}px`
  bodyEl.style.overflow = 'hidden'
}

/**
 * Unlocks the scroll position of the document.
 */
export function unlockScroll() {
  const bodyEl = document.body

  bodyEl.style.removeProperty('overflow')
  bodyEl.style.removeProperty('padding-right')
}

interface PendingFadeOut {
  cancel: () => void
  finalize: () => void
}

const pendingFadeOuts = new Map<HTMLElement, PendingFadeOut>()

export function finishPendingFadeEffects() {
  for (const pending of pendingFadeOuts.values()) pending.finalize()
}

/**
 * Controls the fading animation of an element,
 * showing or hiding it based on visibility.
 */
export function toggleFadeEffect(
  elementId: string,
  visible: boolean,
  hiddenClass: string
) {
  const element = document.getElementById(elementId)
  if (!element) return

  pendingFadeOuts.get(element)?.cancel()

  const trigger = element.dataset.panelTrigger
    ? document.getElementById(element.dataset.panelTrigger)
    : null
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(visible))
    if (!visible && (element.contains(document.activeElement) || document.activeElement === document.body)) {
      trigger.focus()
    }
    element.inert = !visible
  }

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion)'
  ).matches

  if (visible) {
    element.classList.remove(hiddenClass, 'fade-out')
    if (trigger) {
      const target =
        element.querySelector<HTMLElement>('[data-panel-autofocus]') ??
        element.querySelector<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ??
        element
      target.focus()
    }
    if (elementId === 'backdrop') lockScroll()
    if (prefersReducedMotion) {
      element.classList.remove('fade-in')
      return
    }
    element.classList.add('fade-in')
    return
  }

  if (prefersReducedMotion || element.classList.contains(hiddenClass)) {
    element.classList.remove('fade-in', 'fade-out')
    element.classList.add(hiddenClass)
    if (elementId === 'backdrop') unlockScroll()
    return
  }

  element.classList.remove('fade-in')
  element.classList.add('fade-out')

  const cancel = () => {
    element.removeEventListener('animationend', handleAnimationEnd)
    pendingFadeOuts.delete(element)
  }

  const finalize = () => {
    cancel()
    element.classList.remove('fade-in', 'fade-out')
    element.classList.add(hiddenClass)
    if (elementId === 'backdrop') unlockScroll()
  }

  const handleAnimationEnd = (event: Event) => {
    if (event.target !== element) return
    finalize()
  }

  pendingFadeOuts.set(element, { cancel, finalize })
  element.addEventListener('animationend', handleAnimationEnd)
}

/**
 * Resolves a browser URL with Astro's configured base path.
 *
 * base: "/base" + trailingSlash: "ignore" -> BASE_URL: "/base"
 * base: "/base/" + trailingSlash: "ignore" -> BASE_URL: "/base/"
 */
export function withClientBasePath(path: string): string {
  const resolvedPath = `/${import.meta.env.BASE_URL}/${path}`.replace(
    /\/+/,
    '/'
  )

  return new URL(resolvedPath, location.origin).href
}
