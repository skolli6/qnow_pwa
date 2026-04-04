import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { subscribeVendor } from '../services/firestoreService'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [toastMsg, setToastMsg]       = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [currentVendor, setCurrentVendor] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('qnow_vendor')) } catch { return null }
  })
  const [currentCustomer, setCurrentCustomer] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('qnow_customer')) } catch { return null }
  })
  const [adminLogged, setAdminLogged] = useState(() => sessionStorage.getItem('qnow_admin') === '1')
  const toastTimer  = useRef(null)
  const vendorUnsub = useRef(null)

  // Keep vendor state fresh with real-time Firestore subscription
  useEffect(() => {
    if (vendorUnsub.current) { vendorUnsub.current(); vendorUnsub.current = null }
    if (!currentVendor?.id) return
    vendorUnsub.current = subscribeVendor(currentVendor.id, fresh => {
      setCurrentVendor(prev => {
        const merged = { ...prev, ...fresh }
        sessionStorage.setItem('qnow_vendor', JSON.stringify(merged))
        return merged
      })
    })
    return () => { if (vendorUnsub.current) vendorUnsub.current() }
  }, [currentVendor?.id])

  const toast = useCallback((msg, dur = 3500) => {
    setToastMsg(msg); setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), dur)
  }, [])

  const loginVendor = useCallback((vendor) => {
    setCurrentVendor(vendor)
    sessionStorage.setItem('qnow_vendor', JSON.stringify(vendor))
  }, [])

  const logoutVendor = useCallback(() => {
    if (vendorUnsub.current) { vendorUnsub.current(); vendorUnsub.current = null }
    setCurrentVendor(null)
    sessionStorage.removeItem('qnow_vendor')
  }, [])

  const loginCustomer  = useCallback((c) => { setCurrentCustomer(c); sessionStorage.setItem('qnow_customer', JSON.stringify(c)) }, [])
  const logoutCustomer = useCallback(() => { setCurrentCustomer(null); sessionStorage.removeItem('qnow_customer') }, [])
  const loginAdmin     = useCallback(() => { setAdminLogged(true);  sessionStorage.setItem('qnow_admin', '1') }, [])
  const logoutAdmin    = useCallback(() => { setAdminLogged(false); sessionStorage.removeItem('qnow_admin') }, [])

  return (
    <AppContext.Provider value={{
      toast,
      currentVendor, loginVendor, logoutVendor,
      currentCustomer, loginCustomer, logoutCustomer,
      adminLogged, loginAdmin, logoutAdmin,
    }}>
      {children}
      <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMsg}</div>
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
