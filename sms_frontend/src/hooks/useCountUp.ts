import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export default function useCountUp(
  target: number,
  duration = 1400,
  startOnMount = true,
  decimals = 0,
): { value: number; ref: React.RefObject<HTMLSpanElement | null> } {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasStarted = useRef(false)
  const raf = useRef<number>(0)

  const runAnimation = () => {
    const start = performance.now()
    const run = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)
      const current = easedProgress * target
      setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current))
      if (progress < 1) {
        raf.current = requestAnimationFrame(run)
      } else {
        setValue(target)
      }
    }
    raf.current = requestAnimationFrame(run)
  }

  useEffect(() => {
    if (!startOnMount) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          runAnimation()
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf.current)
    }
  }, [target, duration])

  return { value, ref }
}
