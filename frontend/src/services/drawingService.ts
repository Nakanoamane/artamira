interface Drawing {
  id: number;
  title: string;
}

interface DrawingsResponse {
  drawings: Drawing[];
  meta: {
    total_pages: number;
    current_page: number;
    per_page: number;
    total_count: number;
  };
}

export const fetchDrawingsApi = async (page: number, perPage: number): Promise<DrawingsResponse> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings?page=${page}&per_page=${perPage}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
