import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorPage from '../components/ErrorPage'; // Adjust path if necessary

describe('ErrorPage', () => {
  it('renders statusCode and message correctly', () => {
    const statusCode = 404;
    const message = 'ページが見つかりません';
    render(<ErrorPage statusCode={statusCode} message={message} />);

    expect(screen.getByText(statusCode.toString())).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders icon.svg', () => {
    render(<ErrorPage statusCode={500} message="サーバーエラー" />);

    const icon = screen.getByAltText('Error Icon'); // Assuming alt text for the icon
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', '/images/icon.svg'); // Assuming icon.svg is loaded from public directory
  });
});
