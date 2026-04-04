import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import Home             from './screens/Home'
import CustomerBrowse   from './screens/CustomerBrowse'
import CustomerEnroll   from './screens/CustomerEnroll'
import CustomerToken    from './screens/CustomerToken'
import CustomerPinLogin from './screens/CustomerPinLogin'
import VendorAuth       from './screens/VendorAuth'
import VendorDashboard  from './screens/VendorDashboard'
import AdminLogin       from './screens/AdminLogin'
import AdminDashboard   from './screens/AdminDashboard'
import Help             from './screens/Help'
import PrivacyPolicy    from './screens/PrivacyPolicy'
import './index.css'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<Home />} />
          <Route path="/browse"            element={<CustomerBrowse />} />
          <Route path="/enroll/:vendorId"  element={<CustomerEnroll />} />
          <Route path="/token"             element={<CustomerToken />} />
          <Route path="/check"             element={<CustomerPinLogin />} />
          <Route path="/vendor"            element={<VendorAuth />} />
          <Route path="/vendor/dashboard"  element={<VendorDashboard />} />
          <Route path="/admin"             element={<AdminLogin />} />
          <Route path="/admin/dashboard"   element={<AdminDashboard />} />
          <Route path="/help"              element={<Help />} />
          <Route path="/privacy"           element={<PrivacyPolicy />} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
