import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColorPicker from '../../components/ColorPicker'
import { vi, afterEach, beforeEach, it, expect, describe } from 'vitest'
import { act } from 'react'

describe('ColorPicker', () => {
  const mockOnChange = vi.fn()
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    mockOnChange.mockClear()
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
    });
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態でカラーピッカーが表示されていないことを確認する', () => {
    render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    expect(screen.queryByTestId('hex-color-input')).not.toBeInTheDocument()
  })

  it('色選択トグルをクリックするとカラーピッカーが表示される', async () => {
    render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement

    await act(async () => {
      await userEvent.click(toggle)
    });
    await waitFor(() => {
      expect(screen.getByTestId('hex-color-input')).toBeInTheDocument()
      expect((screen.getByTestId('hex-color-input') as HTMLInputElement).value).toBe('FFFFFFFF')
    });
  })

  it('カラーピッカー外をクリックするとピッカーが非表示になる', async () => {
    render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await userEvent.click(toggle)

    await userEvent.click(document.body)

    await waitFor(() => {
      expect(screen.queryByTestId('hex-color-input')).not.toBeInTheDocument()
    })
  })

  it('HEXコード入力フィールドで色を変更すると onChange が呼び出される', async () => {
    const { rerender } = render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });
    await waitFor(() => {
      expect(screen.getByTestId('hex-color-input')).toBeInTheDocument()
    })

    const hexInput = screen.getByTestId('hex-color-input') as HTMLInputElement
    await userEvent.clear(hexInput)
    await userEvent.type(hexInput, 'FF0000FF')

    expect(mockOnChange).toHaveBeenCalledWith('#FF0000FF')

    await waitFor(() => {
      expect((screen.getByTestId('hex-color-input') as HTMLInputElement).value).toBe('FF0000FF');
    });
  })

  it('基本色を選択すると onChange が呼び出される', async () => {
    const { rerender } = render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '基本色 #FF0000FF' })).toBeInTheDocument();
    });

    const redColorButton = screen.getByRole('button', { name: '基本色 #FF0000FF' })
    await userEvent.click(redColorButton)

    expect(mockOnChange).toHaveBeenCalledWith('#FF0000FF')

    rerender(<ColorPicker color="#FF0000FF" onChange={mockOnChange} />)
  })

  it('履歴色が正しく表示され、選択すると onChange が呼び出される', async () => {
    window.localStorage.setItem('colorHistory', JSON.stringify(['#123456FF', '#ABCDEF22']));

    const { rerender } = render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });

    await waitFor(() => {
      expect(screen.getByText('最近使用した色:')).toBeInTheDocument()
      expect(screen.getByTestId('history-color-button-#123456FF')).toBeInTheDocument();
      expect(screen.getByTestId('history-color-button-#ABCDEF22')).toBeInTheDocument();
    });

    const histColor1Button = screen.getByTestId('history-color-button-#123456FF');
    const histColor2Button = screen.getByTestId('history-color-button-#ABCDEF22');

    await userEvent.click(histColor1Button)
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('#123456FF')
    })

    rerender(<ColorPicker color="#123456FF" onChange={mockOnChange} />)
    mockOnChange.mockClear()

    await userEvent.click(histColor2Button)
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('#ABCDEF22')
    })

    rerender(<ColorPicker color="#ABCDEF22" onChange={mockOnChange} />)
  })

  it('ピッカーが閉じられたときに選択された色が履歴に追加される', async () => {
    const { rerender } = render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });

    rerender(<ColorPicker color="#FF0000FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body)
    })

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledTimes(1)
      expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#FF0000FF'])
      )
    })
  })

  it('履歴の最大数が3つであることを確認する', async () => {
    window.localStorage.setItem('colorHistory', JSON.stringify(['#111111FF', '#222222FF', '#333333FF']));

    const { rerender } = render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });

    rerender(<ColorPicker color="#444444FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body)
    })

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledTimes(2)
      expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#444444FF', '#111111FF', '#222222FF'])
      )
    })
  })

  it('同じ色が選択された場合、履歴の先頭に移動し重複しない', async () => {
    window.localStorage.setItem('colorHistory', JSON.stringify(['#111111FF', '#222222FF', '#333333FF']));

    const { rerender } = render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });

    rerender(<ColorPicker color="#222222FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body)
    })

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledTimes(2)
      expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#222222FF', '#111111FF', '#333333FF'])
      )
    })
  })
})
