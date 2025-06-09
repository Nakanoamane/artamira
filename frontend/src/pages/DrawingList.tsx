import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { usePageTitle } from '../hooks/usePageTitle'

interface Drawing {
  id: number;
  title: string;
}

const DrawingList = () => {
  usePageTitle('Boards')

  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const perPage = 10 // 1ページあたりの表示件数

  useEffect(() => {
    const fetchDrawings = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings?page=${currentPage}&per_page=${perPage}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setDrawings(data.drawings)
        setTotalPages(data.meta.total_pages)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDrawings()
  }, [currentPage]) // currentPageが変更されるたびにAPIを再呼び出し

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages))
  }

  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5; // 表示するページ番号の最大数
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          className={`mx-1 px-3 py-1 rounded ${currentPage === i ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-dark-gray hover:bg-medium-gray'}`}
        >
          {i}
        </button>
      )
    }
    return pageNumbers
  }

  if (loading) {
    return <div className="text-center mt-8">描画ボードを読み込み中...</div>
  }

  if (error) {
    return <div className="text-center mt-8 text-status-danger">エラー: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-light-cave-ochre">Boards</h1>
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
            <li key={drawing.id} className="bg-clay-white shadow-md rounded-lg p-6 hover:bg-light-cave-ochre cursor-pointer group transition-colors duration-300">
              <Link to={`/drawings/${drawing.id}`} className="block w-full h-full">
                <span className="text-xl font-semibold text-cave-ochre group-hover:text-clay-white">
                  {drawing.title || `無題の描画ボード (${drawing.id})`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="bg-light-gray text-dark-gray font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-medium-gray"
          >
            前へ
          </button>
          {renderPageNumbers()}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="bg-light-gray text-dark-gray font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-medium-gray"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}

export default DrawingList
