# DrawingList.tsx リファクタリング設計書

## 1. はじめに

この設計書は、`frontend/src/pages/DrawingList.tsx` ファイルの現状の課題を特定し、保守性、効率性、および一般的なReactの設計パターンに沿った改善案を提示することを目的としています。

## 2. 現状の課題

現在の `DrawingList.tsx` は、以下の点で改善の余地があります。

-   **責務の集中**: API呼び出し、状態管理、ページネーションロジック、UIレンダリングなど、複数の責務が単一のコンポーネントに集中しています。
-   **ロジックの再利用性**: APIデータ取得やページネーションロジックがコンポーネント内に直接記述されているため、他のコンポーネントでの再利用が困難です。
-   **可読性の低下**: 特にページネーション部分のロジックや条件付きCSSクラスの記述が、コンポーネントの可読性を低下させています。
-   **型定義の不足**: APIレスポンスの `meta` オブジェクトなど、一部のデータ構造に対する明示的な型定義が不足しています。
-   **マジックナンバー/文字列**: ページあたりの表示件数などの値や、表示されるテキストがハードコードされています。

## 3. リファクタリングの目標

以下の目標を達成することを目指します。

-   コンポーネントの責務分離と再利用性の向上。
-   コードの可読性、保守性、効率性の向上。
-   型安全性の強化。

## 4. 改善案

### 4.1. カスタムフックの導入

コンポーネント内のロジックをカスタムフックとして抽出し、責務の分離と再利用性を高めます。

-   **`useDrawings` フックの作成**: 描画ボードの取得、ローディング状態、エラーハンドリング、ページネーション関連の状態（`currentPage`, `totalPages`, `setDrawings`, `setTotalPages` など）を管理するカスタムフック。
    -   API呼び出しのロジックをこのフック内に集約します。
    -   例：
        ```typescript
        // ... existing code ...
        import { useEffect, useState } from 'react';

        interface Drawing { // DrawingList.tsx から移動または共有
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
          perPage: number; // 必要であれば公開
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
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings?page=${currentPage}&per_page=${perPage}`, {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                });

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
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
        ```

-   **`usePagination` フックの作成**: ページネーションのロジック（前へ/次へボタンのハンドラー、ページ番号のレンダリングロジックなど）を管理するカスタムフック。
    -   `handlePreviousPage`, `handleNextPage`, `handlePageClick`, `renderPageNumbers` のロジックをここに移動します。
    -   `useDrawings` から `currentPage` と `totalPages` を受け取るように設計します。
    -   例：
        ```typescript
        // ... existing code ...
        import React from 'react';

        interface UsePaginationProps {
          currentPage: number;
          totalPages: number;
          onPageChange: (pageNumber: number) => void;
          maxPagesToShow?: number;
        }

        interface UsePaginationResult {
          handlePreviousPage: () => void;
          handleNextPage: () => void;
          renderPageNumbers: () => React.ReactNode[];
        }

        const usePagination = ({ currentPage, totalPages, onPageChange, maxPagesToShow = 5 }: UsePaginationProps): UsePaginationResult => {
          const handlePreviousPage = () => {
            onPageChange(Math.max(currentPage - 1, 1));
          };

          const handleNextPage = () => {
            onPageChange(Math.min(currentPage + 1, totalPages));
          };

          const renderPageNumbers = () => {
            const pageNumbers = [];
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

            if (endPage - startPage + 1 < maxPagesToShow) {
              startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
              pageNumbers.push(
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={`mx-1 px-3 py-1 rounded ${currentPage === i ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-dark-gray hover:bg-medium-gray'}`}
                >
                  {i}
                </button>
              );
            }
            return pageNumbers;
          };

          return {
            handlePreviousPage,
            handleNextPage,
            renderPageNumbers,
          };
        };

        export default usePagination;
        ```

### 4.2. コンポーネントの分割

`DrawingList.tsx` をより小さな責務を持つコンポーネントに分割します。

-   **`DrawingListItem.tsx`**: 各描画ボードの表示を担当するコンポーネント。
    -   `<li>` 要素とその内部の `Link` 、タイトル表示をこのコンポーネントに切り出します。
-   **`PaginationControls.tsx`**: ページネーションのボタンとページ番号の表示を担当するコンポーネント。
    -   `handlePreviousPage`, `handleNextPage`, `renderPageNumbers` を利用してUIを構築します。

### 4.3. APIサービス層の分離

API呼び出しのロジックを独立したサービスファイルに分離します。

-   **`src/services/drawingService.ts` の作成**: 描画ボードの取得に関するAPI呼び出し関数を定義します。
    -   例：
        ```typescript
        // ... existing code ...
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
        ```

### 4.4. 型定義の拡充と定数化

-   APIレスポンスの `meta` オブジェクトに対するTypeScriptの型定義を追加し、コードの型安全性を高めます。
-   `perPage` のような定数や、UIに表示されるテキストを定数として管理し、変更容易性を向上させます。

### 4.5. エラーハンドリングの改善

-   エラーメッセージをより具体的にし、ユーザーに分かりやすい情報を提供するように改善します。

## 5. リファクタリング後の `DrawingList.tsx` の概要

カスタムフックや分割されたコンポーネントを使用することで、`DrawingList.tsx` は以下のように簡潔になります。

```typescript
// ... existing code ...
import React from 'react';
import { Link } from 'react-router-dom'; // assuming react-router-dom for Link
import { usePageTitle } from '../hooks/usePageTitle';
import useDrawings from '../hooks/useDrawings'; // 新しいフック
import usePagination from '../hooks/usePagination'; // 新しいフック
import DrawingListItem from '../components/DrawingListItem'; // 新しいコンポーネント
import PaginationControls from '../components/PaginationControls'; // 新しいコンポーネント

const DrawingList = () => {
  usePageTitle('Boards');

  const { drawings, loading, error, currentPage, totalPages, setCurrentPage } = useDrawings();
  const { handlePreviousPage, handleNextPage, renderPageNumbers } = usePagination({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
  });

  if (loading) {
    return <div className="text-center mt-8">描画ボードを読み込み中...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-status-danger">エラー: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-light-cave-ochre">Boards</h1>
      <div className="text-center mb-6">
        <Link
          to="/drawings/new"
          className="bg-cave-ochre hover:bg-dark-cave-ochre text-clay-white font-bold py-2 px-4 rounded"
          role="button"
        >
          新規描画ボードを作成
        </Link>
      </div>
      {drawings.length === 0 ? (
        <p className="text-center text-medium-gray">まだ描画ボードがありません。</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawings.map((drawing) => (
            <DrawingListItem key={drawing.id} drawing={drawing} />
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          handlePreviousPage={handlePreviousPage}
          handleNextPage={handleNextPage}
          renderPageNumbers={renderPageNumbers}
        />
      )}
    </div>
  );
};

export default DrawingList;
```
