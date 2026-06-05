import { useEffect } from 'react'

/**
 * Locks body scroll while a modal is open.
 *
 * Uses the `position: fixed` technique because it is the ONLY reliable way to
 * stop iOS Safari from scrolling the document behind a fixed overlay when the
 * on-screen keyboard opens. iOS ignores `overflow: hidden` on the body and
 * never restores that scroll when the keyboard hides, which is what leaves the
 * screen cut off. Pinning the body and restoring the exact scroll position on
 * close fixes both the cut-while-open and the not-recovering-after-close.
 *
 * @param {boolean} active whether the lock should be engaged
 */
export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return

    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      // Restore the exact scroll position the user was at before opening.
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
