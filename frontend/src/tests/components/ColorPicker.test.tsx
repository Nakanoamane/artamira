import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColorPicker from '../../components/ColorPicker'
import { vi, MockInstance } from 'vitest'
import { act } from 'react'

describe('ColorPicker', () => {
  const mockOnChange = vi.fn()
  let getItemSpy: MockInstance<((key: string) => string | null)>;
  let setItemSpy: MockInstance<((key: string, value: string) => void)>;

  beforeEach(() => {
    mockOnChange.mockClear()
    // localStorage をモック
    getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => {
      console.log('ColorPicker.test.tsx getItemSpy mock: key=', key);
      if (key === 'colorHistory') {
        // 各テストの開始時に履歴をクリアするために、明示的に空のJSON配列を返す
        return JSON.stringify([]);
      }
      return null; // その他のキーに対してはnullを返す
    });
    setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {});
    vi.spyOn(window.localStorage, 'clear').mockImplementation(() => {});

    // 各テストの開始時にsetItemSpyをクリアするように変更
    setItemSpy.mockClear();
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態でカラーピッカーが表示されていないことを確認する', () => {
    render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    // ポップオーバーの要素がないことを確認（data-testidはピッカーが表示された後にのみ存在）
    expect(screen.queryByTestId('hex-color-input')).not.toBeInTheDocument()
  })

  it('色選択トグルをクリックするとカラーピッカーが表示される', async () => {
    render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement

    await act(async () => {
      await userEvent.click(toggle)
    });
    await waitFor(() => {
      expect(screen.getByTestId('hex-color-input')).toBeInTheDocument() // HEXコード入力フィールドで確認
      expect((screen.getByTestId('hex-color-input') as HTMLInputElement).value).toBe('FFFFFFFF') // value の確認
    });
  })

  it('カラーピッカー外をクリックするとピッカーが非表示になる', async () => {
    render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await userEvent.click(toggle)

    // ピッカー外をクリック
    await userEvent.click(document.body)

    await waitFor(() => {
      // ColorPickerのレンダリング構造を考慮し、hex-color-input が存在しないことを確認
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
    getItemSpy.mockImplementationOnce((key: string) => {
      console.log('ColorPicker.test.tsx getItemSpy mockOnce: key=', key);
      if (key === 'colorHistory') {
        return JSON.stringify(['#123456FF', '#ABCDEF22']);
      }
      return null;
    });

    const { rerender } = render(<ColorPicker color="#FFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle)
    });

    await waitFor(() => {
      expect(screen.getByText('最近使用した色:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '基本色 #123456FF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '基本色 #ABCDEF22' })).toBeInTheDocument();
    });

    const histColor1Button = screen.getByRole('button', { name: '基本色 #123456FF' });
    const histColor2Button = screen.getByRole('button', { name: '基本色 #ABCDEF22' });

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
      await userEvent.click(toggle) // ピッカーを開く
    });

    // 色が変更されたことをシミュレートするためにrerender
    rerender(<ColorPicker color="#FF0000FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body) // ピッカーを閉じる
    })

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledTimes(1)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#FF0000FF'])
      )
    })
  })

  it('履歴の最大数が3つであることを確認する', async () => {
    getItemSpy.mockImplementationOnce((key: string) => {
      if (key === 'colorHistory') {
        return JSON.stringify(['#111111FF', '#222222FF', '#333333FF']);
      }
      return null;
    });

    const { rerender } = render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle) // ピッカーを開く
    });

    // 新しい色が選択されたことをシミュレートするためにrerender
    rerender(<ColorPicker color="#444444FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body) // ピッカーを閉じる
    })

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledTimes(1)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#444444FF', '#111111FF', '#222222FF'])
      )
    })
  })

  it('同じ色が選択された場合、履歴の先頭に移動し重複しない', async () => {
    getItemSpy.mockImplementationOnce((key: string) => {
      if (key === 'colorHistory') {
        return JSON.stringify(['#111111FF', '#222222FF', '#333333FF']);
      }
      return null;
    });

    const { rerender } = render(<ColorPicker color="#FFFFFFFF" onChange={mockOnChange} />)
    const toggle = screen.getByLabelText('色を選択トグル') as HTMLElement
    await act(async () => {
      await userEvent.click(toggle) // ピッカーを開く
    });

    // 履歴にある色が選択されたことをシミュレートするためにrerender
    rerender(<ColorPicker color="#222222FF" onChange={mockOnChange} />)

    await act(async () => {
      await userEvent.click(document.body) // ピッカーを閉じる
    })

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledTimes(1)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        'colorHistory',
        JSON.stringify(['#222222FF', '#111111FF', '#333333FF'])
      )
    })
  })
})
