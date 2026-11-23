import { useId } from 'react'
import { strings } from '../../content/strings'
import { useMediaQuery } from '../../hooks/useLayout'

interface FotoKnopProps {
  busy: boolean
  onFile: (file: File) => void
}

/** Een foto in de ketel. Kiezen, of op een telefoon er een maken. Slepen en plakken kan overal op de pagina */
export function FotoKnop({ busy, onFile }: FotoKnopProps) {
  const id = useId()
  const phone = useMediaQuery('(pointer: coarse)')
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }
  return (
    <div className="foto" aria-busy={busy}>
      <label className="foto-knop slip paper" htmlFor={`${id}-kies`}>
        <span className="foto-polaroid" aria-hidden="true" />
        <span className="hand">{busy ? strings.foto.bezig : strings.foto.knop}</span>
      </label>
      <input id={`${id}-kies`} className="sr-only" type="file" accept="image/*" onChange={pick} disabled={busy} aria-describedby={`${id}-belofte`} />
      {phone && (
        <>
          <label className="quiet foto-camera" htmlFor={`${id}-maak`}>
            {strings.foto.maak}
          </label>
          <input id={`${id}-maak`} className="sr-only" type="file" accept="image/*" capture="environment" onChange={pick} disabled={busy} />
        </>
      )}
      <p className="foto-uitleg">{strings.foto.uitleg}</p>
      <p id={`${id}-belofte`} className="foto-belofte hand">
        {strings.foto.belofte}
      </p>
    </div>
  )
}
