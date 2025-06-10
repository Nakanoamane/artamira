import React, { useState } from 'react'
import { useCreateDrawing } from '../hooks/useCreateDrawing'

const CreateDrawingForm = () => {
  const [title, setTitle] = useState('')
  const { handleCreateDrawing, loading, error } = useCreateDrawing()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleCreateDrawing(title)
  }

  return (
    <div className="container mx-auto p-4 bg-clay-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-light-cave-ochre">新規描画ボードを作成</h1>
      <form onSubmit={handleSubmit} className="bg-clay-white p-6 rounded-lg shadow-md max-w-md mx-auto">
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
