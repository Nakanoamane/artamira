# バグ報告書

## 既知のバグ

- 初回の描画処理が重複している（Strict modeとは関係がない）
- Undo/Redoが2回送信・または受信している
- authService.ts:89 Error fetching current user: TypeError: Failed to fetch
    at getCurrentUser (authService.ts:72:28)
    at checkAuth (AuthContext.tsx:26:33)
    at AuthContext.tsx:30:5

authService.ts:89 Error fetching current user: TypeError: Failed to fetch
    at getCurrentUser (authService.ts:72:28)
    at checkAuth (AuthContext.tsx:26:33)
    at AuthContext.tsx:30:5
