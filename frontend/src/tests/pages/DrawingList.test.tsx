import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import DrawingList from '../../pages/DrawingList'
import { vi } from 'vitest'

// fetchをモックする
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DrawingList', () => {
  beforeEach(() => {
    // 各テストの前にfetchのモックをリセット
    mockFetch.mockReset()
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
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
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
    const mockDrawings = [
      { id: 1, title: '描画ボードA' },
      { id: 2, title: '描画ボードB' },
    ]
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDrawings),
      })
    )

    render(
      <MemoryRouter>
        <DrawingList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('描画ボードA')).toBeInTheDocument()
      expect(screen.getByText('描画ボードB')).toBeInTheDocument()
    })
  })

  it('新規描画ボードを作成リンクが正しいパスを持つことを確認する', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
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
        json: () => Promise.resolve(mockDrawings),
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
        json: () => Promise.resolve(mockDrawings),
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
})
