import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

const CreateDrawingForm = () => {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!user) {
      setError('ユーザーが認証されていません。')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 認証トークンが必要な場合はここに追加
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ drawing: { title, user_id: user.id } }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const newDrawing = await response.json()
      navigate(`/drawings/${newDrawing.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 bg-rock-linen">
      <h1 className="text-3xl font-bold mb-6 text-center">新規描画ボードを作成</h1>
      <form onSubmit={handleSubmit} className="bg-rock-linen p-6 rounded-lg shadow-md max-w-md mx-auto">
        <div className="mb-4">
          <label htmlFor="title" className="block text-flint-gray text-sm font-bold mb-2">
            ボードタイトル:
          </label>
          <input
            type="text"
            id="title"
            className="shadow appearance-none border border-light-gray rounded w-full py-2 px-3 text-flint-gray leading-tight focus:outline-none focus:shadow-cave-ochre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="新しい描画ボードのタイトル"
          />
        </div>
        {error && <p className="text-status-danger text-xs italic mb-4">{error}</p>}
        <button
          type="submit"
          className="bg-cave-ochre hover:bg-dark-cave-ochre text-clay-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-cave-ochre"
          disabled={loading}
        >
          {loading ? '作成中...' : '作成'}
        </button>
      </form>
    </div>
  )
}

export default CreateDrawingForm
