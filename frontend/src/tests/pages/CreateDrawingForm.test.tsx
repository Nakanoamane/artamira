import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import CreateDrawingForm from '../../pages/CreateDrawingForm'
import { vi } from 'vitest'
import * as AuthContext from '../../contexts/AuthContext' // AuthContextをインポート

// fetchをモックする
const mockFetch = vi.fn()
global.fetch = mockFetch

// useNavigate をモックする
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CreateDrawingForm', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockNavigate.mockReset()
    // useAuth フックのデフォルトモックを設定
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, email_address: 'test@example.com' }, // 認証済みユーザーをモック
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    })
  })

  it('フォームが正しくレンダリングされることを確認する', () => {
    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('ボードタイトル:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument()
  })

  it('タイトル入力フィールドに値を入力できる', async () => {
    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )
    const titleInput = screen.getByLabelText('ボードタイトル:')
    await userEvent.type(titleInput, '新しいボード')
    expect(titleInput).toHaveValue('新しいボード')
  })

  it('フォーム送信中にローディング状態を表示する', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // 無限に解決しないPromiseを返す

    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )

    const titleInput = screen.getByLabelText('ボードタイトル:')
    await userEvent.type(titleInput, 'テストタイトル')

    const submitButton = screen.getByRole('button', { name: '作成' })
    await userEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByText('作成中...')).toBeInTheDocument()
  })

  it('描画ボードの作成に成功した場合、新しいボードのページにリダイレクトする', async () => {
    const mockNewDrawing = { id: 123, title: '新しいボード' }
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNewDrawing),
      })
    )

    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )

    const titleInput = screen.getByLabelText('ボードタイトル:')
    await userEvent.type(titleInput, '新しいボード')

    const submitButton = screen.getByRole('button', { name: '作成' })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/drawings/123')
    })
  })

  it('APIコールが失敗した場合にエラーメッセージを表示する', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'タイトルは必須です' }),
      })
    )

    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )

    const titleInput = screen.getByLabelText('ボードタイトル:')
    await userEvent.type(titleInput, 'テストタイトル')

    const submitButton = screen.getByRole('button', { name: '作成' })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
    })
    expect(submitButton).not.toBeDisabled()
  })

  it('ユーザーが認証されていない場合にエラーメッセージを表示する', async () => {
    // ユーザーをnullにモックして認証されていない状態をシミュレート
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    })

    render(
      <MemoryRouter>
        <CreateDrawingForm />
      </MemoryRouter>
    )

    const titleInput = screen.getByLabelText('ボードタイトル:')
    await userEvent.type(titleInput, 'テストタイトル')

    const submitButton = screen.getByRole('button', { name: '作成' })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('ユーザーが認証されていません。')).toBeInTheDocument()
    })
    expect(submitButton).not.toBeDisabled()
  })
})
