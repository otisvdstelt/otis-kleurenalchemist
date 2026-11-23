import { useCallback, useEffect, useRef, useState } from 'react'
import { strings } from '../content/strings'
import { isImage, readPhoto } from '../lib/photo'
import { progress } from '../lib/progress'
import { store } from '../lib/store'

/** Een foto binnenkrijgen: kiezen, slepen of plakken. Zolang de kleuren eruit gehaald worden, borrelt het kolfje */
export function usePhotoIntake() {
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const working = useRef(false)
  const depth = useRef(0)

  const take = useCallback(async (file: File | null | undefined) => {
    if (!isImage(file) || working.current) return
    working.current = true
    setBusy(true)
    const release = progress.hold()
    try {
      const photo = await readPhoto(file)
      store.addPhoto(photo.id, photo.pigments, photo.url)
    } catch {
      store.say(strings.nieuws.fotoMislukt)
    } finally {
      release()
      working.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current++
      setDragging(true)
    }
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth.current = 0
      setDragging(false)
      void take(Array.from(event.dataTransfer?.files ?? []).find((f) => isImage(f)))
    }
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => isImage(f))
      if (!file) return
      event.preventDefault()
      void take(file)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
      window.removeEventListener('paste', paste)
    }
  }, [take])

  return { busy, dragging, take }
}
