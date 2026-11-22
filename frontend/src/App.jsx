import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    axios.get('http://localhost:8080/api/health')
      .then(res => setStatus(`backend says ${res.data.status}`))
      .catch(() => setStatus('backend not reachable'))
  }, [])

  return <h1>Reserba: {status}</h1>
}

export default App