# 実装計画

設計ドキュメント: `/Users/hiroki/Documents/project-doc.md`

## Step 1: プロジェクト初期化

- `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `biome.json`, `.mise.toml` 作成済み
- `npm install` 完了済み

## Step 2: Either モナド

- `src/monad/either.ts` — Left/Right, map, flatMap, match, tryCatch, fromNullable, Do, bind
- `src/monad/either.test.ts`
- `src/monad/index.ts`

## Step 3: 型定義

- `src/types/event.ts` — EventMetadata, DomainEvent, CompensatingEvent, EventDefinition, EventHandler
- `src/types/state.ts` — LWWValue, LWWRegister, Snapshot, ReplayResult
- `src/types/history.ts` — HistoryNode, HistoryTree, UndoRedoOptions
- `src/types/index.ts`

## Step 4: イベントメタデータ & defineEvent

- `src/event/metadata.ts` — Zodスキーマ, createMetadata, validateMetadata
- `src/event/define-event.ts` — defineEvent(), safeCreateEvent()
- `src/event/metadata.test.ts`
- `src/event/define-event.test.ts`
- `src/event/index.ts`

## Step 5: LWW 競合解決

- `src/state/lww.ts` — resolveLWW, mergeLWWRegisters, materialize
- `src/state/lww.test.ts`
- テスト: タイムスタンプ比較, 同一タイムスタンプ時のID比較, プロパティ単位マージ

## Step 6: apply

- `src/state/apply.ts` — apply(state, event, handler) => Either
- `src/state/apply.test.ts`
- テスト: 初期状態への適用, イミュータビリティ, LWW競合解決, 異常系

## Step 7: pipe

- `src/pipe/pipe.ts` — pipe(), liftHandler()
- `src/pipe/pipe.test.ts`
- `src/pipe/index.ts`
- テスト: 合成, 短絡評価, エッジケース

## Step 8: HistoryTree

- `src/history/tree.ts` — createTree, appendNode, getPathToNode, moveHead, getAncestorsByUser
- `src/history/tree.test.ts`
- テスト: 木構造の作成, 分岐, パス辿り, ユーザーフィルタ

## Step 9: compensate

- `src/history/compensate.ts` — diffStates, compensate()
- `src/history/compensate.test.ts`
- テスト: Undo/Redo補償イベント生成, diff計算

## Step 10: undo / redo / goTo

- `src/history/undo-redo.ts` — undo, redo, goTo
- `src/history/undo-redo.test.ts`
- `src/history/index.ts`
- テスト: 設計ドキュメントのシナリオ1-10に対応

## Step 11: replay（内部）

- `src/state/replay.ts` — sortEvents, replay()
- `src/state/replay.test.ts`
- `src/state/index.ts`

## Step 12: barrel exports & ビルド確認

- `src/index.ts` 及び各モジュールの `index.ts`
- `npm run build` で正常にビルドされることを確認
- `dist/index.js` と `dist/index.d.ts` が生成されること

## Step 13: lint & テスト全体通過

- `npm run lint` — Biome による静的解析通過
- `npm run test:run` — 全ユニットテスト通過
- `npm run build` — ビルド成功
