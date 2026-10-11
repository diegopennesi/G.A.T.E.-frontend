import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/App.css'
import { SearchableSelect } from '../../src/shared/components/SearchableSelect'

export function ControlsFixture() {
  const [value, setValue] = useState('')
  return <main>
    <SearchableSelect ariaLabel="Reame operativo" placeholder="Cerca reame" value={value} onChange={setValue} options={[
      { value: 'one', label: 'Reame del Nord' },
      { value: 'two', label: 'Reame del Sud' },
      { value: 'three', label: 'Reame delle Isole' },
    ]} />
    <output aria-label="Reame selezionato">{value}</output>
    <button type="button">Azione successiva</button>
  </main>
}
createRoot(document.getElementById('root')!).render(<ControlsFixture />)
