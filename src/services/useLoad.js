import { useEffect, useRef, useState } from 'react'

// Загрузка данных: { data, loading, error, retry, setData }. key — когда нужно перезагрузить (например, смена :id)
export function useLoad(loader, key = '') {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  const loaderRef = useRef(loader)
  useEffect(() => { loaderRef.current = loader })

  useEffect(() => {
    let active = true
    loaderRef.current()
      .then((data) => { if (active) setState({ data, loading: false, error: '' }) })
      .catch((error) => { if (active) setState({ data: null, loading: false, error: error.message }) })
    return () => { active = false }
  }, [attempt, key])

  const retry = () => { setState((current) => ({ ...current, loading: true, error: '' })); setAttempt((value) => value + 1) }
  const setData = (updater) => setState((current) => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater }))
  return { ...state, retry, setData }
}
