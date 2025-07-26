import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { Toaster } from './components/ui/toaster'
import Dashboard from './pages/Dashboard'
import LoadingScreen from './components/LoadingScreen'
import LandingPage from './components/LandingPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LandingPage />
  }

  return (
    <>
      <Dashboard user={user} />
      <Toaster />
    </>
  )
}

export default App