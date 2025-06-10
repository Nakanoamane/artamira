# Toolbarコンポーネントリファクタリング設計書

## 1. 目的

`frontend/src/components/Toolbar.tsx` ファイルは、現在多くの機能を持つ単一のコンポーネントとして実装されています。本設計書は、以下の目的のためにToolbarコンポーネントのリファクタリング計画を定義します。

- コードの可読性と保守性の向上
- コンポーネントの責務の明確化と単一責任原則の徹底
- 将来的な機能拡張への対応とプロップドリリングの軽減
- マジックストリングの排除によるバグの抑制

## 2. 既存のToolbarコンポーネントの現状と課題

### 現状

`Toolbar.tsx` は、以下のUI要素とそれに対応する状態管理関数を`props`として受け取り、描画アプリケーションの主要な操作パネルとして機能しています。

- ツール選択 (ペン、消しゴム、直線、四角、円)
- 保存/エクスポートボタン
- Undo/Redoボタン
- カラーピッカー
- ブラシサイズスライダー

### 課題

1.  **多くのprops**: `Toolbar` コンポーネントは多くの`props`（`activeTool`, `activeColor`, `activeBrushSize`, `setActiveTool`, `setActiveColor`, `setActiveBrushSize`, `onUndo`, `onRedo`, `canUndo`, `canRedo`, `onSave`, `isDirty`, `onExportClick`）を受け取っており、コードの見通しが悪くなっています。これは「プロップドリル」の兆候であり、将来的にアプリケーションが拡大した場合、状態管理が複雑化する可能性があります。
2.  **マジックストリング**: ツール名（`"pen"`, `"eraser"` など）が文字列リテラルとして直接コードに埋め込まれています。これにより、タイプミスによるバグのリスクや、ツールの追加・変更時の修正漏れが発生しやすくなっています。
3.  **単一コンポーネント内の多様な責務**: 現在の`Toolbar`は、ツール選択、操作履歴、保存機能など、複数の異なる機能グループを一つのコンポーネントで管理しています。これにより、コンポーネントの肥大化と理解の難易度が増しています。

## 3. リファクタリング計画

以下のステップでリファクタリングを実施します。

### ステップ1: マジックストリングの定数化

ツール名を定数として定義し、コード全体で利用します。

-   **ファイル**: `frontend/src/constants/tools.ts` を新規作成します。
-   **内容**:
    ```typescript
    // frontend/src/constants/tools.ts
    export const TOOLS = {
      PEN: 'pen',
      ERASER: 'eraser',
      LINE: 'line',
      RECTANGLE: 'rectangle',
      CIRCLE: 'circle',
    } as const;

    export type ToolName = typeof TOOLS[keyof typeof TOOLS];
    ```
-   **変更箇所**: `Toolbar.tsx` 内のツール名文字列を、新しく定義した定数に置き換えます。

### ステップ2: `ToolbarButton` の改善

`ToolbarButton` コンポーネントの`toolName`の型を`ToolName`に制限します。

-   **ファイル**: `frontend/src/components/Toolbar.tsx`
-   **変更箇所**: `ToolbarButtonProps` インターフェースの`toolName`の型を`string`から`ToolName`に変更します。

### ステップ3: `Toolbar` コンポーネントの分割

`Toolbar` コンポーネントを機能ごとに分割し、責務を明確にします。

-   **`Toolbar`**: メインのコンポーネントとして残し、分割したサブコンポーネントを統合する役割を担います。`props`の受け渡しは継続します。
-   **新規コンポーネント**:
    -   `frontend/src/components/toolbar/ToolSelectionGroup.tsx`: ツール選択ボタン（ペン、消しゴムなど）を管理します。
    -   `frontend/src/components/toolbar/ActionButtons.tsx`: 保存とエクスポートボタンを管理します。
    -   `frontend/src/components/toolbar/HistoryButtons.tsx`: Undo/Redoボタンを管理します。

#### `ToolSelectionGroup.tsx` の実装例

```typescript
// frontend/src/components/toolbar/ToolSelectionGroup.tsx
import React from 'react';
import { TOOLS, ToolName } from '../../constants/tools';
import { ToolbarButton } from './ToolbarButton'; // ToolbarButtonがToolbarから独立する場合

interface ToolSelectionGroupProps {
  activeTool: ToolName;
  setActiveTool: (tool: ToolName) => void;
}

const ToolSelectionGroup = ({ activeTool, setActiveTool }: ToolSelectionGroupProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">ツール</label>
      <div className="flex gap-2">
        <ToolbarButton toolName={TOOLS.PEN} activeTool={activeTool} onToolChange={setActiveTool}>
          ペン
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.ERASER} activeTool={activeTool} onToolChange={setActiveTool}>
          消しゴム
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.LINE} activeTool={activeTool} onToolChange={setActiveTool}>
          直線
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.RECTANGLE} activeTool={activeTool} onToolChange={setActiveTool}>
          四角
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.CIRCLE} activeTool={activeTool} onToolChange={setActiveTool}>
          円
        </ToolbarButton>
      </div>
    </div>
  );
};

export default ToolSelectionGroup;
```

#### `ActionButtons.tsx` の実装例

```typescript
// frontend/src/components/toolbar/ActionButtons.tsx
import React from 'react';

interface ActionButtonsProps {
  onSave: () => void;
  isDirty: boolean;
  onExportClick: () => void;
}

const ActionButtons = ({ onSave, isDirty, onExportClick }: ActionButtonsProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">操作</label>
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-md ${isDirty ? 'bg-stone-blue text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onSave}
          disabled={!isDirty}
        >
          保存 {isDirty && '*'}
        </button>
        <button
          className="px-4 py-2 rounded-md border-2 border-stone-blue text-flint-gray hover:bg-stone-blue hover:text-clay-white"
          onClick={onExportClick}
        >
          エクスポート
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
```

#### `HistoryButtons.tsx` の実装例

```typescript
// frontend/src/components/toolbar/HistoryButtons.tsx
import React from 'react';

interface HistoryButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryButtons = ({ onUndo, onRedo, canUndo, canRedo }: HistoryButtonsProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">履歴</label>
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-md ${canUndo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          className={`px-4 py-2 rounded-md ${canRedo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default HistoryButtons;
```

### ステップ4: `Toolbar` コンポーネントの更新

分割したコンポーネントをインポートし、`Toolbar` 内で利用するように変更します。また、`ToolbarButton`は`Toolbar`コンポーネントの内部にとどめ、`ToolbarButtonProps`インターフェースを更新します。

### ステップ5: テストの更新と新規テストの追加

-   既存の`Toolbar.test.tsx`を更新し、リファクタリング後も全てのテストがパスすることを確認します。
-   新しく作成した`ToolSelectionGroup.tsx`, `ActionButtons.tsx`, `HistoryButtons.tsx`に対して、それぞれユニットテストを新規作成します。テストは既存の`Toolbar.test.tsx`を参考に、各コンポーネントの役割に特化したテストケースを記述します。

## 4. テスト計画

### 既存テストの確認

リファクタリング後、以下のコマンドで既存のユニットテストが全てパスすることを確認します。

```bash
docker compose exec frontend npm test
```

### 新規ユニットテストの作成

以下のファイルに対してユニットテストを新規作成します。

-   `frontend/src/tests/components/toolbar/ToolSelectionGroup.test.tsx`
-   `frontend/src/tests/components/toolbar/ActionButtons.test.tsx`
-   `frontend/src/tests/components/toolbar/HistoryButtons.test.tsx`

各テストファイルでは、対応するコンポーネントが正しくレンダリングされ、`props`に応じた振る舞いをすることを確認します。例えば、ボタンクリック時に正しいコールバックが呼ばれること、`disabled`状態が正しく適用されることなどをテストします。

## 5. デグレーション防止策

-   リファクタリングは段階的に行い、各ステップでテストを実行して変更が意図しない影響を与えていないことを確認します。
-   特に、`props`の受け渡しやイベントハンドラが正しく機能していることを重視してテストします。
-   既存の`Toolbar.test.tsx`を綿密に確認し、必要なテストケースがカバーされていることを再確認します。不足している場合は追加します。

## 6. 今後の展望 (オプション)

今回のリファクタリングでは`props`の受け渡しはそのままですが、将来的に状態管理がさらに複雑化する場合は、React Context APIやRedux/Zustand/Jotaiなどの状態管理ライブラリの導入を検討することで、`Toolbar`コンポーネントが直接`props`を受け取る量をさらに減らすことができます。これは、アプリケーション全体のアーキテクチャ設計と合わせて検討されるべき事項です。
