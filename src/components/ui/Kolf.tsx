import { useId, useRef, useState, type MouseEvent } from 'react'
import { strings } from '../../content/strings'
import { store, useAlchemy } from '../../lib/store'
import { FotoKnop } from './FotoKnop'

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** "#3b5" en "3b533e" worden allebei "#3b533e" */
function normalise(text: string): string | null {
  const match = text.trim().match(HEX)
  if (!match) return null
  const raw = match[1].toLowerCase()
  return `#${raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw}`
}

interface KolfProps {
  busy: boolean
  trouble: string | null
  onFile: (file: File) => void
}

/** De lege kolf: jouw kleur, als hexcode, met de kleurkiezer, of geprikt uit een foto. Hij blijft precies zo */
export function Kolf({ busy, trouble, onFile }: KolfProps) {
  const id = useId()
  const bases = useAlchemy((s) => s.cauldron.bases)
  const photo = useAlchemy((s) => s.photo)
  const [text, setText] = useState('')
  const [wrong, setWrong] = useState(false)
  const picture = useRef<HTMLImageElement>(null)
  const full = bases.length >= 2

  const pour = (value: string) => {
    const hex = normalise(value)
    if (!hex) {
      setWrong(true)
      return
    }
    setWrong(false)
    setText('')
    store.addBase(hex)
  }

  // De pipet: lees de pixel onder je vinger uit het kleine plaatje
  const prick = (event: MouseEvent<HTMLImageElement>) => {
    const img = picture.current
    if (!img || full) return
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(img, 0, 0)
    const box = img.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * img.naturalWidth)
    const y = Math.floor(((event.clientY - box.top) / box.height) * img.naturalHeight)
    const [r, g, b] = context.getImageData(Math.min(x, img.naturalWidth - 1), Math.min(y, img.naturalHeight - 1), 1, 1).data
    store.addBase(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`)
  }

  return (
    <div className="kolf">
      {bases.length > 0 && (
        <ul className="kolf-kleuren">
          {bases.map((hex, i) => (
            <li key={`${hex}-${i}`} className="kolf-kleur">
              <span className="kolf-staal" style={{ background: hex }} aria-hidden="true" />
              <span className="hand">{i === 0 ? strings.kast.hoofd : strings.kast.accent}</span>
              <code>{hex}</code>
              <button type="button" className="kolf-weg" aria-label={strings.kast.giet(hex)} onClick={() => store.removeBase(i)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="kolf-vol">{strings.kast.vol}</p>
      ) : (
        <form
          className="kolf-vullen"
          onSubmit={(event) => {
            event.preventDefault()
            pour(text)
          }}
        >
          <div className="field kolf-hex">
            <label htmlFor={`${id}-hex`}>{strings.kast.hex}</label>
            <input id={`${id}-hex`} value={text} placeholder="#3b533e" spellCheck={false} autoComplete="off" aria-invalid={wrong} aria-describedby={wrong ? `${id}-fout` : undefined} onChange={(event) => setText(event.target.value)} />
          </div>
          <label className="kolf-kiezer" title={strings.kast.kies}>
            <span className="sr-only">{strings.kast.kies}</span>
            <input type="color" value={bases.at(-1) ?? '#3b533e'} onChange={(event) => setText(event.target.value)} />
          </label>
          <button type="submit" className="inked">
            {strings.kast.vul}
          </button>
          {wrong && (
            <p id={`${id}-fout`} className="foto-fout">
              {strings.kast.hexFout}
            </p>
          )}
        </form>
      )}

      <FotoKnop busy={busy} trouble={trouble} onFile={onFile} />
      {photo && !full && (
        <div className="pipet">
          <p className="hand pipet-kop">{strings.kast.pipet}</p>
          <p className="foto-uitleg">{strings.kast.pipetUitleg}</p>
          {/* De foto zelf is voor de muis. De kleuren eronder zijn knoppen, voor iedereen */}
          <img ref={picture} src={photo.url} alt="" className="pipet-foto" onClick={prick} />
          <ul className="pipet-kleuren">
            {photo.pigments.map((hex) => (
              <li key={hex}>
                <button type="button" className="pipet-kleur" style={{ background: hex }} aria-label={strings.kast.uitFoto(hex)} onClick={() => store.addBase(hex)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
