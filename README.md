# @kurimonad/event-sourcing

Firebase非依存のイベントソーシングライブラリ。モナディックなAPI、LWW競合解決、木構造の履歴管理を提供する。

## 必要環境

- Node.js >= 24
- npm

[mise](https://mise.jdx.dev/) を使用している場合は `.mise.toml` で自動的に Node.js 24 が適用される。

## セットアップ

```bash
npm install
```

Zod は peerDependency のため、利用側で別途インストールが必要。

```bash
npm install zod
```

## スクリプト

| コマンド | 説明 |
|---|---|
| `npm run build` | Vite ライブラリモードでビルド（`dist/` に出力） |
| `npm test` | Vitest をウォッチモードで起動 |
| `npm run test:run` | テストを1回実行 |
| `npm run test:coverage` | カバレッジ付きでテスト実行 |
| `npm run lint` | Biome で静的解析 |
| `npm run lint:fix` | Biome で静的解析 + 自動修正 |
| `npm run format` | Biome でフォーマット |

## 公開API

### Monad

| 関数 | 説明 |
|---|---|
| `left(value)` / `right(value)` | Either コンストラクタ |
| `isLeft(either)` / `isRight(either)` | 型ガード |
| `map(either, f)` | Right 値を変換 |
| `flatMap(either, f)` | Right 値に Either を返す関数を適用（短絡評価） |
| `match(either, { onLeft, onRight })` | パターンマッチ |
| `tryCatch(f)` | try-catch を Either に変換 |
| `fromNullable(value, onNull)` | null/undefined を Left に変換 |
| `Do` / `bind(either, name, f)` | モナディック Do 記法 |

### Event

| 関数 | 説明 |
|---|---|
| `defineEvent(type, schema)` | 型安全なイベント定義 |
| `safeCreateEvent(def, metadata, payload)` | バリデーション付きイベント生成 |
| `createMetadata(params)` | イベントメタデータ生成 |
| `validateMetadata(input)` | メタデータの Zod バリデーション |

### State

| 関数 | 説明 |
|---|---|
| `apply(state, event, handler)` | 状態にイベントを適用 |
| `resolveLWW(a, b)` | LWW でどちらの値を採用するか判定 |
| `mergeLWWRegisters(a, b)` | プロパティ単位で LWW マージ |
| `materialize(register)` | LWWRegister から値を取り出す |
| `sortEvents(events)` | タイムスタンプ + ID 順でソート |
| `replay(events, handler, init)` | イベント列から状態を再構築 |

### Pipe

| 関数 | 説明 |
|---|---|
| `pipe(state, steps)` | 複数のイベント適用を順に合成 |
| `liftHandler(type, handler)` | イベント型でディスパッチするハンドラに変換 |

### History

| 関数 | 説明 |
|---|---|
| `createTree(event)` | 初期イベントから履歴木を作成 |
| `appendNode(tree, event)` | 木に子ノードを追加 |
| `getPathToNode(tree, nodeId)` | root から指定ノードまでのパスを取得 |
| `moveHead(tree, nodeId)` | head を指定ノードに移動 |
| `getAncestorsByUser(tree, userId)` | 指定ユーザーの祖先イベントを取得 |
| `diffStates(before, after)` | 状態の差分を計算 |
| `compensate(before, after, metadata)` | 補償イベントを生成 |
| `undo(tree, state, handler)` | 直近のイベントを取り消す |
| `redo(tree, nodeId, state, handler)` | 指定ノードのイベントを再適用 |
| `goTo(tree, nodeId, handler, init)` | 任意の履歴ノードにジャンプ |

## ディレクトリ構成

```
event-sourcing/
├── .mise.toml
├── biome.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── docs/
├── src/
│   ├── index.ts
│   ├── monad/
│   ├── types/
│   ├── event/
│   ├── state/
│   ├── pipe/
│   └── history/
└── dist/
```

## 技術スタック

| 項目 | 値 |
|---|---|
| ビルド | Vite（ライブラリモード）|
| モジュール | ESM only |
| テスト | Vitest |
| 依存 | Zod（peerDependency）|
| リンター | Biome |
| モナド | 自作（内包、依存ゼロ）|
