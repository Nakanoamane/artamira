import { useEffect, useState } from 'react';
import { fetchDrawingsApi } from '../services/drawingService';

interface Drawing {
  id: number;
  title: string;
}

interface UseDrawingsResult {
  drawings: Drawing[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  perPage: number;
}

const useDrawings = (initialPage: number = 1, initialPerPage: number = 10): UseDrawingsResult => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = initialPerPage;

  useEffect(() => {
    const fetchDrawings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDrawingsApi(currentPage, perPage);
        setDrawings(data.drawings);
        setTotalPages(data.meta.total_pages);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDrawings();
  }, [currentPage, perPage]);

  return {
    drawings,
    loading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    perPage,
  };
};

export default useDrawings;
