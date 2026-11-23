import { useEffect, useState } from 'react'
import { strings } from '../../content/strings'
import type { Bottle } from '../../lib/alchemy/bottle'
import { toCss, toJson, toTailwind } from '../../lib/alchemy/exports'
import { encodeBottle } from '../../lib/alchemy/share'
import { store } from '../../lib/store'
import { bottlePng, download, fileName } from './png'

/** De link naar een flesje: de kleuren zitten er zelf in */
const bottleLink = (bottle: Bottle) => `${window.location.origin}/fles/${encodeBottle(bottle)}`

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Het palet mee naar buiten: als link, als CSS of Tailwind, als JSON of als plaatje */
export function Meenemen({ bottle }: { bottle: Bottle }) {
  const [note, setNote] = useState<{ at: string; text: string } | null>(null)
  // Een handgeschreven bevestiging, die na een tel weer verdwijnt
  useEffect(() => {
    if (!note) return
    const timer = window.setTimeout(() => setNote(null), 1600)
    return () => window.clearTimeout(timer)
  }, [note])
  const canShare = typeof navigator.share === 'function'

  const confirm = (at: string, ok: boolean, what: string) => {
    const text = ok ? strings.fles.gekopieerd : strings.fles.nietGekopieerd
    setNote({ at, text })
    store.say(ok ? strings.nieuws.gekopieerd(what) : strings.fles.nietGekopieerd)
  }

  const actions: { id: string; label: string; run: () => Promise<void> }[] = [
    { id: 'css', label: strings.delen.kopieer(strings.delen.css), run: async () => confirm('css', await copy(toCss(bottle)), strings.delen.css) },
    { id: 'tailwind', label: strings.delen.kopieer(strings.delen.tailwind), run: async () => confirm('tailwind', await copy(toTailwind(bottle)), strings.delen.tailwind) },
    { id: 'json', label: strings.delen.download(strings.delen.json), run: async () => download(new Blob([toJson(bottle)], { type: 'application/json' }), fileName(bottle, 'json')) },
    { id: 'png', label: strings.delen.download(strings.delen.png), run: async () => download(await bottlePng(bottle), fileName(bottle, 'png')) },
  ]

  return (
    <section className="meenemen" aria-labelledby="meenemen-kop">
      <h3 id="meenemen-kop" className="toonbank-sub">
        {strings.delen.kop}
      </h3>
      <div className="meenemen-link">
        <button type="button" className="inked" onClick={async () => confirm('link', await copy(bottleLink(bottle)), strings.delen.link)}>
          {strings.delen.link}
        </button>
        {canShare && (
          <button type="button" className="quiet" onClick={() => void navigator.share({ title: bottle.name, url: bottleLink(bottle) }).catch(() => undefined)}>
            {strings.delen.deel}
          </button>
        )}
        {note?.at === 'link' && (
          <span className="meenemen-bevestiging tag" aria-hidden="true">
            {note.text}
          </span>
        )}
      </div>
      <p className="meenemen-uitleg">{strings.delen.linkUitleg}</p>
      <ul className="meenemen-rij">
        {actions.map(({ id, label, run }) => (
          <li key={id}>
            <button type="button" className="quiet" onClick={() => void run()}>
              {label}
            </button>
            {note?.at === id && (
              <span className="meenemen-bevestiging tag" aria-hidden="true">
                {note.text}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
