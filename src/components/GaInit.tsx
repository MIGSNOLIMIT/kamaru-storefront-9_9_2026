import { useEffect } from 'react'
import { useSiteSettings } from '../hooks/useContent'
import { initGa4 } from '../lib/analytics'

export function GaInit() {
  const { data } = useSiteSettings()
  useEffect(() => {
    initGa4(data?.ga4MeasurementId)
  }, [data?.ga4MeasurementId])
  return null
}
