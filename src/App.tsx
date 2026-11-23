import { useCallback, useRef, useState } from 'react'
import { PaperFilters } from './components/ui/Chrome'
import { Flesje } from './components/ui/Flesje'
import { Header } from './components/ui/Header'
import { Kast } from './components/ui/Kast'
import { Ketel } from './components/ui/Ketel'
import { Kolfje } from './components/ui/Kolfje'
import { Nieuws } from './components/ui/Nieuws'
import { useIngredients } from './hooks/useIngredients'
import { keepPhase, readPhase, type Phase } from './lib/air'

export default function App() {
  const [phase, setPhase] = useState<Phase>(readPhase)
  const ingredients = useIngredients()
  const flaskRef = useRef<HTMLElement>(null)

  const choosePhase = useCallback((next: Phase) => {
    setPhase(next)
    keepPhase(next)
  }, [])

  // Na het bottelen gaat de aandacht naar het flesje. Op een telefoon schuift het in beeld
  const poured = useCallback(() => {
    // Wacht tot het flesje getekend is, anders klopt de hoogte nog niet
    requestAnimationFrame(() => {
      const flask = flaskRef.current
      // Op een breed scherm staat het flesje er al naast
      if (!flask || window.matchMedia('(min-width: 1024px)').matches) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      flask.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    })
  }, [])

  return (
    <div className="papier">
      <PaperFilters />
      <Header phase={phase} onPhase={choosePhase} />
      <main className="tafel">
        <Kast ingredients={ingredients.data} failed={ingredients.isError} />
        <Ketel onPoured={poured} />
        <Flesje ref={flaskRef} />
      </main>
      <Nieuws />
      <Kolfje />
    </div>
  )
}
