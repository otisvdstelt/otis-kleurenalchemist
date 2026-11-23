import { useEffect, useId, useRef } from 'react'
import { strings } from '../../content/strings'

/** Als kopiëren naar het klembord niet mag: de link als tekst, al geselecteerd, om zelf te kopiëren */
export function ZelfKopieren({ link }: { link: string }) {
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    field.current?.focus()
    field.current?.select()
  }, [link])
  return (
    <div className="zelf-kopieren field">
      <label htmlFor={id}>{strings.delen.zelfKopieren}</label>
      <input id={id} ref={field} type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
    </div>
  )
}
