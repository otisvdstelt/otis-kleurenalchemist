import { PaperFilters } from './components/ui/Chrome'
import { Kolfje } from './components/ui/Kolfje'
import { strings } from './content/strings'

export default function App() {
  return (
    <div className="min-h-full p-6 sm:p-10">
      <PaperFilters />
      <main className="mx-auto grid max-w-2xl gap-6">
        <h1 className="m-0 font-script text-4xl leading-normal font-normal">{strings.titel}</h1>
        <p className="slip paper hand m-0 w-fit -rotate-1 text-lg">{strings.ondertitel}</p>
        <button type="button" className="plaque w-fit">
          Stook de ketel op
        </button>
      </main>
      <Kolfje />
    </div>
  )
}
