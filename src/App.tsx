import { Component, lazy, Suspense, useCallback, useRef, useState, type ReactNode } from 'react'
import { PaperFilters } from './components/ui/Chrome'
import { Flesje } from './components/ui/Flesje'
import { Header } from './components/ui/Header'
import { Kast } from './components/ui/Kast'
import { Ketel } from './components/ui/Ketel'
import { Borrelend, Kolfje } from './components/ui/Kolfje'
import { Nieuws } from './components/ui/Nieuws'
import type { CauldronOnScreen } from './components/World'
import { strings } from './content/strings'
import { useIngredients } from './hooks/useIngredients'
import { canPaint, isModest, useMediaQuery } from './hooks/useLayout'
import { keepPhase, readPhase, type Phase } from './lib/air'
import { useAlchemy } from './lib/store'

// three.js en alles wat erbij hoort komt in een eigen chunk, zodat de papieren laag eerst staat
const World = lazy(() => import('./components/World'))

/** Kan de werkplaats niet geschilderd worden (geen WebGL, een mislukte download), dan blijft alles op papier werken */
class Unpaintable extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(readPhase)
  const [painted, setPainted] = useState(canPaint)
  const [failed, setFailed] = useState(false)
  const [onScreen, setOnScreen] = useState<CauldronOnScreen | null>(null)
  const [flaskOpen, setFlaskOpen] = useState(true)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const hasFlask = useAlchemy((s) => s.flask !== null)
  const ingredients = useIngredients()
  const flaskRef = useRef<HTMLElement>(null)
  const [modest] = useState(isModest)

  const choosePhase = useCallback((next: Phase) => {
    setPhase(next)
    keepPhase(next)
  }, [])

  // Na het bottelen gaat de aandacht naar het flesje
  const poured = useCallback(() => {
    setFlaskOpen(true)
    // Wacht tot het flesje getekend is, anders klopt de hoogte nog niet
    requestAnimationFrame(() => {
      const flask = flaskRef.current
      if (!flask) return
      if (painted) {
        flask.scrollTop = 0
        return
      }
      // Op een breed scherm staat het flesje er al naast
      if (window.matchMedia('(min-width: 1024px)').matches) return
      flask.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    })
  }, [painted, reducedMotion])

  const fail = useCallback(() => {
    setPainted(false)
    setFailed(true)
  }, [])

  return (
    <div className="papier" data-wereld={painted}>
      <PaperFilters />
      {painted && (
        <div className="wereld">
          <Unpaintable onFail={fail}>
            <Suspense fallback={<Borrelend />}>
              <World phase={phase} reducedMotion={reducedMotion} modest={modest} onReady={() => undefined} onCauldron={setOnScreen} />
            </Suspense>
          </Unpaintable>
        </div>
      )}
      <Header phase={phase} onPhase={choosePhase} />
      {failed && <p className="mislukt slip paper hand">{strings.wereld.mislukt}</p>}
      <main className="tafel">
        <Kast ingredients={ingredients.data} failed={ingredients.isError} />
        <Ketel onPoured={poured} onScreen={painted ? onScreen : undefined} />
        {(!painted || (hasFlask && flaskOpen)) && <Flesje ref={flaskRef} onClose={painted ? () => setFlaskOpen(false) : undefined} />}
        {painted && hasFlask && !flaskOpen && (
          <button type="button" className="slip paper hand terug-naar-fles" onClick={() => setFlaskOpen(true)}>
            {strings.fles.terug}
          </button>
        )}
      </main>
      <Nieuws />
      <Kolfje />
    </div>
  )
}
