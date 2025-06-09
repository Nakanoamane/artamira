# CreateDrawingForm コンポーネントのリファクタリング設計書

## 1. 目的

`frontend/src/pages/CreateDrawingForm.tsx` ファイルは、現在、UIレンダリング、フォームの状態管理、API呼び出しロジック、エラーハンドリングなど、複数の役割を一つのコンポーネント内で担っています。これにより、コードの可読性、再利用性、テスト容易性が低下しています。本設計書の目的は、以下の改善点に基づき、`CreateDrawingForm` コンポーネントをリファクタリングし、コード品質の向上と保守性の確保を図ることです。

- ロジックとUIの分離
- APIエンドポイントの定数化
- 認証情報の取り扱いの一元化

## 2. 既存のコードの概要

現在の `CreateDrawingForm.tsx` は以下の機能を持ちます。

- `useState` を利用したタイトル入力、ローディング、エラー状態の管理。
- `useAuth` からユーザー情報を取得し、認証状態を確認。
- フォーム送信時に `fetch` API を使用してバックエンド (`/api/v1/drawings`) に POST リクエストを送信。
- レスポンスの成功/失敗に応じて、ナビゲーションまたはエラーメッセージの表示。

## 3. 改善点と新しい設計

### 3.1. ロジックとUIの分離 (カスタムフックの導入)

API呼び出し、ローディング、エラー状態管理のロジックをカスタムフック `useCreateDrawing` として分離します。これにより、`CreateDrawingForm` コンポーネントはUIのレンダリングに専念できるようになります。

#### 新しいファイル: `frontend/src/hooks/useCreateDrawing.ts`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { createDrawing } from '../services/drawingService'; // 新しく作成するAPIサービス

export const useCreateDrawing = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateDrawing = async (title: string) => {
    setLoading(true);
    setError(null);

    if (!user) {
      setError('ユーザーが認証されていません。');
      setLoading(false);
      return;
    }

    try {
      const newDrawing = await createDrawing(title, user.id);
      navigate(`/drawings/${newDrawing.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { handleCreateDrawing, loading, error };
};
```

#### `frontend/src/pages/CreateDrawingForm.tsx` の変更点

`useCreateDrawing` カスタムフックを使用するように変更します。

```typescript
import React, { useState } from 'react';
// ... existing code ...
import { useCreateDrawing } from '../hooks/useCreateDrawing'; // 新しく作成するカスタムフックをインポート

const CreateDrawingForm = () => {
  const [title, setTitle] = useState('');
  const { handleCreateDrawing, loading, error } = useCreateDrawing(); // カスタムフックを使用

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateDrawing(title);
  };

  return (
    // ... existing code ...
  );
};

export default CreateDrawingForm;
```

### 3.2. APIエンドポイントの定数化 (APIクライアント層の導入)

APIエンドポイントを定数化し、APIリクエストを抽象化するサービス層 `drawingService.ts` を導入します。これにより、APIパスの変更に対する耐性が向上し、コードの保守性が向上します。

#### 新しいファイル: `frontend/src/services/drawingService.ts`

```typescript
import { User } from '../contexts/AuthContext'; // User型をインポート

interface Drawing {
  id: number;
  title: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const createDrawing = async (title: string, userId: User['id']): Promise<Drawing> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/drawings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`, // 認証トークンが必要な場合はここで一元管理
    },
    body: JSON.stringify({ drawing: { title, user_id: userId } }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
```

### 3.3. 認証情報の取り扱いの一元化

現状、`createDrawing`関数には認証トークンに関するコメントアウトされた行がありますが、`useAuth`コンテキストが既に認証状態を管理しているため、認証トークンが必要な場合は、`AuthContext` または認証関連のユーティリティ関数内で一元的に管理し、APIリクエスト時に自動的に付与されるようにすることが理想的です。

この設計では、`drawingService.ts` 内で認証トークンを直接扱うのではなく、認証が必要なAPI呼び出しは、`AuthContext` の提供する関数や、トークンを自動的に付与するHTTPクライアントラッパーを介して行うことを推奨します。これにより、トークンの取得、更新、失効のロジックが一箇所に集約され、セキュリティと保守性が向上します。

## 4. テスト計画

### 4.1. 既存のユニットテストの確認

リファクタリング後も、既存の `frontend/src/tests/pages/CreateDrawingForm.test.tsx` が問題なく動作することを確認します。

### 4.2. 新しいユニットテストの作成

新しく作成するカスタムフック `useCreateDrawing` とAPIサービス `drawingService.ts` に対してユニットテストを作成します。

#### 新しいファイル: `frontend/src/tests/hooks/useCreateDrawing.test.ts`

`useCreateDrawing` のカスタムフックのテスト。`@testing-library/react-hooks` (または `react-hooks-testing-library`) のようなライブラリを利用することが理想的ですが、ここではより一般的な `@testing-library/react` と `vi.mock` を用いた方法で記述します。

```typescript
import { renderHook, act } from '@testing-library/react-hooks'; // react-hooks-testing-library を使用する場合
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useCreateDrawing } from '../../hooks/useCreateDrawing';
import * as AuthContext from '../../contexts/AuthContext';
import * as DrawingService from '../../services/drawingService';
import { MemoryRouter } from 'react-router';

// useNavigate をモックする
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useCreateDrawing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, email_address: 'test@example.com' },
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  it('描画作成が成功した場合、ナビゲートされること', async () => {
    const mockDrawing = { id: 123, title: 'Test Drawing' };
    vi.spyOn(DrawingService, 'createDrawing').mockResolvedValue(mockDrawing);

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/drawings/123');
  });

  it('描画作成が失敗した場合、エラーがセットされること', async () => {
    const errorMessage = 'API Error';
    vi.spyOn(DrawingService, 'createDrawing').mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ユーザーが認証されていない場合、エラーがセットされること', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('ユーザーが認証されていません。');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
```

#### 新しいファイル: `frontend/src/tests/services/drawingService.test.ts`

`drawingService` のユニットテスト。

```typescript
import { vi } from 'vitest';
import { createDrawing } from '../../services/drawingService';

// fetchをモックする
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('drawingService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('描画作成APIが成功した場合、新しい描画データを返すこと', async () => {
    const mockDrawing = { id: 1, title: 'Test Drawing' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDrawing),
    });

    const result = await createDrawing('Test Title', 1);
    expect(mockFetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/api/v1/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawing: { title: 'Test Title', user_id: 1 } }),
      credentials: 'include',
    });
    expect(result).toEqual(mockDrawing);
  });

  it('描画作成APIが失敗した場合、エラーをスローすること', async () => {
    const errorMessage = 'Internal Server Error';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: errorMessage }),
    });

    await expect(createDrawing('Test Title', 1)).rejects.toThrow(errorMessage);
  });

  it('HTTPステータスが不正な場合、汎用エラーメッセージをスローすること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}), // メッセージがない場合
    });

    await expect(createDrawing('Test Title', 1)).rejects.toThrow('HTTP error! status: 404');
  });
});
```

## 5. 実装手順

1.  `frontend/src/services/` ディレクトリを作成し、`drawingService.ts` を作成します。
2.  `frontend/src/hooks/` ディレクトリを作成し、`useCreateDrawing.ts` を作成します。
3.  `frontend/src/pages/CreateDrawingForm.tsx` を修正し、`useCreateDrawing` を利用するように変更します。
4.  既存のユニットテスト `frontend/src/tests/pages/CreateDrawingForm.test.tsx` がデグレーションなく動作することを確認します。
5.  `frontend/src/tests/hooks/` ディレクトリを作成し、`useCreateDrawing.test.ts` を作成します。
6.  `frontend/src/tests/services/` ディレクトリを作成し、`drawingService.test.ts` を作成します。
7.  新しく作成したテストがすべてパスすることを確認します。

## 6. デグレーションテスト

実装後、以下の手順でデグレーションが発生していないことを確認します。

1.  既存のユニットテストを実行します。
    ```bash
    docker compose exec frontend npm test
    ```
2.  手動でアプリケーションを起動し、新規描画ボード作成機能が期待通りに動作することを確認します。

    - フォームが表示されるか
    - タイトルを入力して送信できるか
    - 成功時にリダイレクトされるか
    - エラー時にメッセージが表示されるか
    - ローディング状態が正しく表示されるか
