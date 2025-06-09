import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DrawingListItem from '../../components/DrawingListItem';

describe('DrawingListItem', () => {
  const mockDrawing = {
    id: 1,
    title: 'Test Drawing',
  };

  it('描画ボードのタイトルとリンクを正しく表示すること', () => {
    render(
      <MemoryRouter>
        <DrawingListItem drawing={mockDrawing} />
      </MemoryRouter>
    );

    const linkElement = screen.getByText(mockDrawing.title);
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.closest('a')).toHaveAttribute('href', `/drawings/${mockDrawing.id}`);
  });

  it('タイトルがない場合にデフォルトのタイトルを表示すること', () => {
    const drawingWithoutTitle = { id: 2, title: null };
    render(
      <MemoryRouter>
        <DrawingListItem drawing={drawingWithoutTitle} />
      </MemoryRouter>
    );

    const defaultTitleElement = screen.getByText(`無題の描画ボード (${drawingWithoutTitle.id})`);
    expect(defaultTitleElement).toBeInTheDocument();
    expect(defaultTitleElement.closest('a')).toHaveAttribute('href', `/drawings/${drawingWithoutTitle.id}`);
  });
});
