import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import DrawingList from '../../pages/DrawingList'
import { vi } from 'vitest'

// fetchをモックする
const mockFetch = vi.fn()
global.fetch = mockFetch

// react-router-dom から Link をモックする
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode; [key: string]: any }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe('DrawingList', () => {
  beforeEach(() => {
    // 各テストの前にfetchのモックをリセット
    mockFetch.mockReset()
    // ページネーションを考慮したデフォルトのモック実装
    mockFetch.mockImplementation((url) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('per_page') || '10', 10)

      // ダミーの描画ボードデータを生成 (25件)
      const allDrawings = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `描画ボード ${i + 1}`,
      }))

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      const paginatedDrawings = allDrawings.slice(startIndex, endIndex)

      const totalCount = allDrawings.length
      const totalPages = Math.ceil(totalCount / perPage)

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            drawings: paginatedDrawings,
            meta: {
              total_pages: totalPages,
              total_count: totalCount,
              current_page: page,
              per_page: perPage,
            },
          }),
      })
    })
  })

  it('描画ボードの読み込み中にローディングメッセージを表示する', () => {
    // fetchが解決されない状態をシミュレート
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    expect(screen.getByText('描画ボードを読み込み中...')).toBeInTheDocument()
  })

  it('描画ボードのフェッチに失敗した場合にエラーメッセージを表示する', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/エラー: HTTP error! status: 500/)).toBeInTheDocument()
    })
  })

  it('描画ボードが空の場合に「まだ描画ボードがありません。」と表示する', async () => {
    // 描画ボードが空でメタデータも空のレスポンスを返す
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: [],
          meta: {
            total_pages: 0,
            total_count: 0,
            current_page: 1,
            per_page: 10,
          },
        }),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('まだ描画ボードがありません。')).toBeInTheDocument()
    })
  })

  it('描画ボードのリストを正しく表示する', async () => {
    // デフォルトのモックfetchが25件のデータから1ページ目を返す
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
      expect(screen.getByText('描画ボード 10')).toBeInTheDocument() // 1ページ目 (10件) の最後の項目
      expect(screen.queryByText('描画ボード 11')).not.toBeInTheDocument() // 2ページ目の項目は表示されない
    })
  })

  it('新規描画ボードを作成リンクが正しいパスを持つことを確認する', async () => {
    // 描画ボードが空のレスポンスを返す
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: [],
          meta: {
            total_pages: 0,
            total_count: 0,
            current_page: 1,
            per_page: 10,
          },
        }),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      const createLink = screen.getByRole('button', { name: /新規描画ボードを作成/i })
      expect(createLink).toBeInTheDocument()
      expect(createLink).toHaveAttribute('href', '/drawings/new')
    })
  })

  it('描画ボードのタイトルが表示されない場合にデフォルトのタイトルを表示する', async () => {
    const mockDrawings = [
      { id: 1, title: '' }, // 空のタイトル
      { id: 2, title: null }, // nullのタイトル
      { id: 3, title: undefined }, // undefinedのタイトル
    ]
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: mockDrawings,
          meta: {
            total_pages: 1,
            total_count: 3,
            current_page: 1,
            per_page: 10,
          },
        }),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('無題の描画ボード (1)')).toBeInTheDocument()
      expect(screen.getByText('無題の描画ボード (2)')).toBeInTheDocument()
      expect(screen.getByText('無題の描画ボード (3)')).toBeInTheDocument()
    })
  })

  it('各描画ボードへのリンクが正しいパスを持つことを確認する', async () => {
    const mockDrawings = [
      { id: 10, title: 'テストボード' },
    ]
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: mockDrawings,
          meta: {
            total_pages: 1,
            total_count: 1,
            current_page: 1,
            per_page: 10,
          },
        }),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      const drawingLink = screen.getByText('テストボード')
      expect(drawingLink).toBeInTheDocument()
      expect(drawingLink.closest('a')).toHaveAttribute('href', '/drawings/10')
    })
  })

  // ページネーション関連のテストケース
  it('初期表示時にページネーションUIと現在のページ情報が表示される', async () => {
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('前へ')).toBeInTheDocument()
      expect(screen.getByText('次へ')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // 現在のページ番号
      expect(screen.getByText('3')).toBeInTheDocument() // 総ページ数 (25件 / 10件/ページ = 2.5 -> 3ページ)
      expect(screen.getByText('3')).toHaveClass('bg-light-gray') // 総ページ数 (25件 / 10件/ページ = 2.5 -> 3ページ)なので、ページ番号 3 が表示されていることを確認
    })
  })

  it('最初のページでは「前へ」ボタンが無効化されている', async () => {
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('前へ')).toBeDisabled()
    })
  })

  it('最後のページでは「次へ」ボタンが無効化されている', async () => {
    // 最初のfetch（初期ロード）で1ページ目のデータ
    mockFetch.mockImplementationOnce((url) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('per_page') || '10', 10)

      const allDrawings = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `描画ボード ${i + 1}`,
      }))
      const paginatedDrawings = allDrawings.slice(0, perPage) // 1ページ目

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: paginatedDrawings,
          meta: {
            total_pages: 3,
            total_count: 25,
            current_page: 1,
            per_page: perPage,
          },
        }),
      })
    })
    // 「2」ボタンクリック後のfetchで2ページ目のデータ
    .mockImplementationOnce((url) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('per_page') || '10', 10)

      const allDrawings = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `描画ボード ${i + 1}`,
      }))
      const paginatedDrawings = allDrawings.slice(perPage, perPage * 2) // 2ページ目

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: paginatedDrawings,
          meta: {
            total_pages: 3,
            total_count: 25,
            current_page: 2,
            per_page: perPage,
          },
        }),
      })
    })
    // 「3」ボタンクリック後のfetchで3ページ目のデータ
    .mockImplementationOnce((url) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('per_page') || '10', 10)

      const allDrawings = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `描画ボード ${i + 1}`,
      }))
      const paginatedDrawings = allDrawings.slice(perPage * 2, perPage * 3) // 3ページ目

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: paginatedDrawings,
          meta: {
            total_pages: 3,
            total_count: 25,
            current_page: 3,
            per_page: perPage,
          },
        }),
      })
    })

    // 最初に1ページ目をロード
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
    })

    // 2ページ目に移動
    fireEvent.click(screen.getByText('2'))
    await waitFor(() => {
      expect(screen.getByText('描画ボード 11')).toBeInTheDocument()
    })

    // 3ページ目（最終ページ）に移動
    fireEvent.click(screen.getByText('3'))
    await waitFor(() => {
      expect(screen.getByText('描画ボード 21')).toBeInTheDocument()
      expect(screen.getByText('次へ')).toBeDisabled()
    })
  })

  it('「次へ」ボタンをクリックすると次のページが読み込まれる', async () => {
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('次へ'))

    await waitFor(() => {
      expect(screen.getByText('描画ボード 11')).toBeInTheDocument()
      expect(screen.queryByText('描画ボード 1')).not.toBeInTheDocument() // 前のページの項目は表示されない
      expect(screen.getByText('2')).toHaveClass('bg-cave-ochre') // 現在のページが2になっていることを確認
    })
  })

  it('「前へ」ボタンをクリックすると前のページが読み込まれる', async () => {
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
    })

    // まず2ページ目に移動
    fireEvent.click(screen.getByText('次へ'))
    await waitFor(() => {
      expect(screen.getByText('描画ボード 11')).toBeInTheDocument()
    })

    // 「前へ」ボタンをクリック
    fireEvent.click(screen.getByText('前へ'))
    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
      expect(screen.queryByText('描画ボード 11')).not.toBeInTheDocument() // 次のページの項目は表示されない
      expect(screen.getByText('1')).toHaveClass('bg-cave-ochre') // 現在のページが1になっていることを確認
    })
  })

  it('特定のページ番号をクリックするとそのページが読み込まれる', async () => {
    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボード 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('3')) // 3ページ目をクリック (描画ボード 21-25)

    await waitFor(() => {
      expect(screen.getByText('描画ボード 21')).toBeInTheDocument()
      expect(screen.queryByText('描画ボード 1')).not.toBeInTheDocument()
      expect(screen.getByText('3')).toHaveClass('bg-cave-ochre') // 現在のページが3になっていることを確認
    })
  })

  it('総ページ数が1の場合、ページネーションUIが表示されない', async () => {
    // 描画ボードが少なく、総ページ数が1になるようにモック
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          drawings: [{ id: 1, title: '描画ボード 1' }],
          meta: {
            total_pages: 1,
            total_count: 1,
            current_page: 1,
            per_page: 10,
          },
        }),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText('前へ')).not.toBeInTheDocument()
      expect(screen.queryByText('次へ')).not.toBeInTheDocument()
      expect(screen.queryByText('1')).not.toBeInTheDocument() // ページ番号も表示されない
    })
  })
})
