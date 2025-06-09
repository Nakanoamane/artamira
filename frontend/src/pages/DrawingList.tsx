import { usePageTitle } from '../hooks/usePageTitle'
import useDrawings from '../hooks/useDrawings'
import usePagination from '../hooks/usePagination.tsx'
import DrawingListItem from '../components/DrawingListItem'
import PaginationControls from '../components/PaginationControls'
import { Link } from 'react-router-dom'

const DrawingList = () => {
  usePageTitle('Boards')

  const { drawings, loading, error, currentPage, totalPages, setCurrentPage } = useDrawings()

  const { handlePreviousPage, handleNextPage, renderPageNumbers } = usePagination({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
  })

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
            <DrawingListItem key={drawing.id} drawing={drawing} />
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          handlePreviousPage={handlePreviousPage}
          handleNextPage={handleNextPage}
          renderPageNumbers={renderPageNumbers}
        />
      )}
    </div>
  )
}

export default DrawingList
