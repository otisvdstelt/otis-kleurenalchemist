// Geluid, synthetisch met Web Audio: borrelen, plonzen, roeren en een klokje van glas. Geen audiobestanden.
// Het staat standaard uit, en gaat pas aan als iemand het zelf aanzet

import { currentBrew, store, type State } from './store'

let context: AudioContext | null = null
let master: GainNode | null = null
let enabled = false
let bubbling: number | undefined
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

/** Wat er de vorige keer in de store stond, om te horen wat er veranderd is */
let before: State | null = null

function audio(): AudioContext {
  if (!context) {
    context = new AudioContext()
    master = context.createGain()
    master.gain.value = 0.6
    master.connect(context.destination)
  }
  return context
}

/** Een belletje dat knapt: een toon die snel omhoog schiet en wegsterft */
function bloop(pitch: number, loud = 0.08, at = 0) {
  const ac = audio()
  const t = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitch, t)
  osc.frequency.exponentialRampToValueAtTime(pitch * 2.6, t + 0.07)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(loud, t + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
  osc.connect(gain).connect(master!)
  osc.start(t)
  osc.stop(t + 0.13)
}

/** Ruis door een filter, voor roeren en sissen */
function hush(seconds: number, from: number, to: number, loud: number) {
  const ac = audio()
  const t = ac.currentTime
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = ac.createBufferSource()
  source.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + seconds)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(loud, t + seconds * 0.3)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  source.connect(filter).connect(gain).connect(master!)
  source.start(t)
}

/** Glas tegen glas: twee hoge tonen die lang naklinken */
function clink() {
  const ac = audio()
  const t = ac.currentTime
  for (const [pitch, loud] of [
    [2093, 0.06],
    [3136, 0.035],
    [4186, 0.02],
  ] as const) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.frequency.value = pitch
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(loud, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    osc.connect(gain).connect(master!)
    osc.start(t)
    osc.stop(t + 1.2)
  }
}

/** Hoe vaak er per tik een bel knapt, naar hoe de ketel erbij staat */
const RATE = { leeg: 0, rustig: 0.12, onrustig: 0.5, overkoken: 0.8 }

function tick() {
  const boil = currentBrew()?.boil ?? 'leeg'
  if (Math.random() < RATE[boil]) bloop(160 + Math.random() * 260, boil === 'rustig' ? 0.04 : 0.07)
}

/** Luister naar wat er in de werkplaats gebeurt en maak er geluid bij */
function listen(next: State) {
  const prev = before
  before = next
  if (!prev || !enabled) return
  if (next.cauldron.items.length > prev.cauldron.items.length) {
    bloop(110, 0.12)
    bloop(220, 0.06, 0.05)
  }
  if (next.stir.at !== prev.stir.at) hush(0.35, 400, 1400, 0.08)
  if (next.flask !== prev.flask && next.flask?.from === 'ketel') {
    // Klokken, en dan het tikje van de kurk
    for (let i = 0; i < 5; i++) bloop(140 + i * 25, 0.05, i * 0.09)
    window.setTimeout(clink, 700)
  }
  const wasOver = currentBrew(prev)?.boil === 'overkoken'
  const isOver = currentBrew(next)?.boil === 'overkoken'
  if (isOver && !wasOver) hush(1.2, 2500, 600, 0.06)
}

export const sound = {
  on: () => enabled,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /**
   * Aan of uit. Aanzetten gebeurt altijd vanuit een klik, zodat de browser het geluid toelaat.
   * Bij het openen van de pagina staat het altijd uit, ook als het de vorige keer aan stond
   */
  set(on: boolean) {
    enabled = on
    window.clearInterval(bubbling)
    if (on) {
      void audio().resume()
      before = store.get()
      unsubscribe ??= store.subscribe(() => listen(store.get()))
      bubbling = window.setInterval(tick, 140)
      bloop(330, 0.06)
    } else {
      unsubscribe?.()
      unsubscribe = null
      void context?.suspend()
    }
    for (const listener of listeners) listener()
  },
}
