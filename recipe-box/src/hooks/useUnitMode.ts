import { useCallback, useState } from 'react'
import { UNIT_MODE_KEY, UNIT_MODES, type UnitMode } from '../lib/measures'

function read(): UnitMode {
  try {
    const v = localStorage.getItem(UNIT_MODE_KEY)
    return UNIT_MODES.some((m) => m.value === v) ? (v as UnitMode) : 'written'
  } catch {
    return 'written'
  }
}

/** The measurement display choice, remembered on this device for every recipe. */
export function useUnitMode(): [UnitMode, (m: UnitMode) => void] {
  const [mode, setMode] = useState<UnitMode>(read)
  const update = useCallback((m: UnitMode) => {
    setMode(m)
    try {
      localStorage.setItem(UNIT_MODE_KEY, m)
    } catch {
      /* the choice just is not remembered */
    }
  }, [])
  return [mode, update]
}
