import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { usePageTitle } from '../hooks/usePageTitle'

interface Drawing {
  id: number;
  title: string;
}

const DrawingList = () => {
  usePageTitle('描画ボード一覧')

  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDrawings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings`, {
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setDrawings(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDrawings()
  }, [])

  if (loading) {
    return <div className="text-center mt-8">描画ボードを読み込み中...</div>
  }

  if (error) {
    return <div className="text-center mt-8 text-status-danger">エラー: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">描画ボード一覧</h1>
      <div className="text-center mb-6">
        <Link
          to="/drawings/new"
          className="bg-cave-ochre hover:bg-dark-cave-ochre text-clay-white font-bold py-2 px-4 rounded"
          role="button"
        >
          新規描画ボードを作成
        </Link>
      </div>
      {drawings.length === 0 ? (
        <p className="text-center text-medium-gray">まだ描画ボードがありません。</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawings.map((drawing) => (
            <li key={drawing.id} className="bg-rock-linen shadow-md rounded-lg p-6">
              <Link to={`/drawings/${drawing.id}`} className="text-xl font-semibold text-cave-ochre hover:underline">
                {drawing.title || `無題の描画ボード (${drawing.id})`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DrawingList
