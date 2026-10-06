/** Scrolls an element into view, smoothly unless the user prefers reduced motion. */
export function scrollToElement(element: Element, block: ScrollLogicalPosition = 'start'): void {
  const reduceMotion =
    element.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;
  element.scrollIntoView?.({ block, behavior: reduceMotion ? 'auto' : 'smooth' });
}
