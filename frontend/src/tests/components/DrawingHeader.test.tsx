import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DrawingHeader from '../../components/DrawingHeader';

describe('DrawingHeader', () => {
  let toLocaleStringSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function (this: Date, _, options) {
      if (options && options.year && options.month && options.day && options.hour && options.minute && options.second) {
        return '2023/1/1 12:34:56';
      }
      return '';
    });
  });

  afterAll(() => {
    toLocaleStringSpy.mockRestore();
  });

  it('描画タイトルが正しく表示されること', () => {
    render(<DrawingHeader title="My Test Drawing" isDirty={false} lastSavedAt={null} />);
    expect(screen.getByText('My Test Drawing')).toBeInTheDocument();
  });

  it('isDirtyがtrueの場合に「未保存の変更があります」が表示されること', () => {
    render(<DrawingHeader title="My Test Drawing" isDirty={true} lastSavedAt={null} />);
    expect(screen.getByText('未保存の変更があります')).toBeInTheDocument();
  });

  it('isDirtyがfalseの場合に「未保存の変更があります」が表示されないこと', () => {
    render(<DrawingHeader title="My Test Drawing" isDirty={false} lastSavedAt={null} />);
    expect(screen.queryByText('未保存の変更があります')).not.toBeInTheDocument();
  });

  it('lastSavedAtが設定されている場合に最終保存日時が正しく表示されること', () => {
    const testDate = new Date('2023-01-01T12:34:56Z');
    render(<DrawingHeader title="My Test Drawing" isDirty={false} lastSavedAt={testDate} />);
    expect(screen.getByText('最終保存: 2023/1/1 12:34:56')).toBeInTheDocument();
    expect(toLocaleStringSpy).toHaveBeenCalledWith('ja-JP', expect.any(Object));
  });

  it('lastSavedAtがnullの場合に「まだ保存されていません」が表示されること', () => {
    render(<DrawingHeader title="My Test Drawing" isDirty={false} lastSavedAt={null} />);
    expect(screen.getByText('最終保存: まだ保存されていません')).toBeInTheDocument();
  });
});
