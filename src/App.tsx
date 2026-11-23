import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PaperFilters } from './components/ui/Chrome'
import { Flesje } from './components/ui/Flesje'
import { FotoKnop } from './components/ui/FotoKnop'
import { Header } from './components/ui/Header'
import { Kast } from './components/ui/Kast'
import { Ketel } from './components/ui/Ketel'
import { Borrelend, Kolfje } from './components/ui/Kolfje'
import { Nieuws } from './components/ui/Nieuws'
import { Plank } from './components/ui/Plank'
import type { CauldronOnScreen, View } from './components/World'
import { strings } from './content/strings'
import { useIngredients } from './hooks/useIngredients'
import { usePhotoIntake } from './hooks/usePhotoIntake'
import { canPaint, isModest, useMediaQuery } from './hooks/useLayout'
import { keepPhase, readPhase, type Phase } from './lib/air'
import { decodeBottle, decodeShelf, encodeBottle, readRoute, type Route } from './lib/alchemy/share'
import { store, useAlchemy } from './lib/store'

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
  // Een gedeelde link wordt één keer gelezen, bij het openen
  const [route] = useState<Route>(() => readRoute(window.location.pathname, window.location.hash))
  const flask = useAlchemy((s) => s.flask)
  const [failed, setFailed] = useState(false)
  const [onScreen, setOnScreen] = useState<CauldronOnScreen | null>(null)
  const [flaskOpen, setFlaskOpen] = useState(true)
  const [view, setView] = useState<View>(() => (route.kind === 'plank' ? 'plank' : 'werkplaats'))
  const intake = usePhotoIntake()

  useEffect(() => {
    if (route.kind === 'fles') {
      const bottle = decodeBottle(route.code)
      if (bottle) store.open(bottle, 'link')
    } else if (route.kind === 'plank') {
      const bottles = decodeShelf(route.code)
      if (bottles) store.visit(bottles)
    }
    // Een gedeelde plank laat het adres los. Een flesje houdt het, zolang het open ligt
    if (route.kind === 'plank') window.history.replaceState(null, '', `/${window.location.search}`)
    if (route.kind === 'fles') window.history.replaceState({ fles: true }, '', window.location.pathname + window.location.search)
  }, [route])

  // Zolang er een flesje open ligt, staat het in het adres: /fles/<code>. Terug in de browser legt het weer weg
  const shown = flask !== null && (!painted || flaskOpen)
  useEffect(() => {
    if (!shown || !flask) return
    const target = `/fles/${encodeBottle(flask.bottle)}${window.location.search}`
    if (window.location.pathname + window.location.search === target) return
    if (window.location.pathname.startsWith('/fles/')) window.history.replaceState({ fles: true }, '', target)
    else window.history.pushState({ fles: true, gepusht: true }, '', target)
  }, [shown, flask])

  useEffect(() => {
    const follow = () => {
      const now = readRoute(window.location.pathname, window.location.hash)
      if (now.kind === 'fles') {
        const bottle = decodeBottle(now.code)
        const current = store.get().flask
        if (bottle && (!current || encodeBottle(current.bottle) !== now.code)) store.open(bottle, 'link')
        setFlaskOpen(true)
      } else {
        setFlaskOpen(false)
        store.close()
      }
    }
    window.addEventListener('popstate', follow)
    return () => window.removeEventListener('popstate', follow)
  }, [])

  /** Het flesje wegleggen: terug in de geschiedenis als het daar vandaan kwam, anders het adres terugzetten */
  const putAway = useCallback(() => {
    // Alleen terug als wij het flesje zelf in de geschiedenis zetten. Een gedeelde link is de eerste pagina
    if ((window.history.state as { gepusht?: boolean } | null)?.gepusht) {
      window.history.back()
      return
    }
    setFlaskOpen(false)
    window.history.replaceState(null, '', `/${window.location.search}`)
  }, [])
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const hasFlask = flask !== null
  const ingredients = useIngredients()
  const flaskRef = useRef<HTMLElement>(null)
  const [modest] = useState(isModest)

  const choosePhase = useCallback((next: Phase) => {
    setPhase(next)
    keepPhase(next)
  }, [])

  // Na het bottelen gaat de aandacht naar het flesje
  const poured = useCallback(() => {
    // In de werkplaats wacht het vel even tot het flesje vol is gelopen, zodat je het inschenken ziet
    if (painted && !reducedMotion) {
      setFlaskOpen(false)
      window.setTimeout(() => setFlaskOpen(true), 2300)
    } else setFlaskOpen(true)
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
    <div className="papier" data-wereld={painted} data-uitzicht={painted ? view : undefined} data-fles={painted && hasFlask && flaskOpen}>
      <PaperFilters />
      {/* De werkplaats is alleen weergave: alles wat je ermee kunt, staat ook in de papieren laag */}
      {painted && (
        <div className="wereld" aria-hidden="true">
          <Unpaintable onFail={fail}>
            <Suspense fallback={<Borrelend />}>
              <World phase={phase} view={view} reducedMotion={reducedMotion} modest={modest} onReady={() => undefined} onCauldron={setOnScreen} onOpenBottle={() => setFlaskOpen(true)} />
            </Suspense>
          </Unpaintable>
        </div>
      )}
      <Header phase={phase} onPhase={choosePhase} view={painted ? view : undefined} onView={setView} />
      {failed && <p className="mislukt slip paper hand">{strings.wereld.mislukt}</p>}
      <main>
        <div className="tafel">
        <Kast ingredients={ingredients.data} failed={ingredients.isError} photo={<FotoKnop busy={intake.busy} onFile={(file) => void intake.take(file)} />} />
        <Ketel onPoured={poured} onScreen={painted ? onScreen : undefined} />
        {(!painted || (hasFlask && flaskOpen)) && <Flesje ref={flaskRef} onClose={painted ? putAway : undefined} />}
        {painted && hasFlask && !flaskOpen && (
          <button type="button" className="slip paper hand terug-naar-fles" onClick={() => setFlaskOpen(true)}>
            {strings.fles.terug}
          </button>
        )}
        </div>
        <Plank onOpen={() => setFlaskOpen(true)} />
      </main>
      {intake.dragging && (
        <p className="sleep-hint slip paper hand" aria-hidden="true">
          {strings.foto.loslaten}
        </p>
      )}
      <Nieuws />
      <Kolfje />
    </div>
  )
}
