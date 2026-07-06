import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setError('Failed to reach backend'))
  }, [])

  return (
    <div className="p-8">
      {status && <p className="text-green-600">Backend status: {status}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!status && !error && <p className="text-gray-500">Checking backend...</p>}
    </div>
  )
}

export default App
