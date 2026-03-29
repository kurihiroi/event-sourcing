# イベントソーシングのメリット・デメリット

## 概要

イベントソーシング（Event Sourcing）は、アプリケーションの状態変更をすべて「イベント」として不変に記録し、イベント列の再生によって現在の状態を導出するアーキテクチャパターンである。本レポートでは、メリット・デメリットを整理し、参考文献をまとめる。

---

## メリット

### 1. 完全な監査証跡（Audit Trail）

すべての状態変更がイベントとして記録されるため、「誰が・いつ・何を」変更したかを完全に追跡できる。CRUD モデルでは上書きにより失われる履歴が、自然に保持される。金融・医療・法規制対応が求められるドメインで特に有用。

本リポジトリでも `EventMetadata` に `userId`, `timestamp` を含め、`createMetadata()` で生成する設計がこれを体現している。

### 2. 時間軸クエリ（Temporal Query）

任意の時点の状態を再構築できる。「先月末時点のデータ」「バグ発生直前の状態」といった問いに答えられる。本リポジトリの `goTo(tree, nodeId, handler, init)` や `getPathToNode(tree, nodeId)` がこの機能を実現している。

### 3. イベントリプレイ（Event Replay）

イベント列を再生することで状態を一から再構築できる。

- バグ修正後に正しいロジックで状態を再計算
- 新しい読み取りモデル（プロジェクション）を過去のイベントから構築
- テスト・デバッグの容易化

本リポジトリの `replay(events, handler, init)` がこの機能を提供。

### 4. 疎結合とイベント駆動アーキテクチャ

イベント中心の設計により、コンポーネント間の結合度が低下する。発行者と消費者が独立して開発・デプロイでき、マイクロサービスとの親和性が高い。本リポジトリの `liftHandler(type, handler)` や `pipe(state, steps)` による合成パターンが疎結合を体現。

### 5. スケーラビリティ

- イベントストアは追記専用（append-only）のため書き込みが高速
- CQRS と組み合わせることで読み取り・書き込みを独立にスケール可能
- イベントログはパーティショニング・シャーディングと相性が良い

### 6. Undo/Redo と補償トランザクション

過去のイベントに対して補償イベント（Compensating Event）を発行することで論理的な取り消しが可能。本リポジトリでは `compensate(before, after, metadata)`, `undo()`, `redo()` が実装されている。

### 7. 競合解決

分散環境での競合解決が容易になる。本リポジトリの `resolveLWW(a, b)`（Last Writer Wins）や `mergeLWWRegisters(a, b)` がその実装例。イベントの順序付けにより決定論的な競合解決が可能。

### 8. ドメイン知識の明示化

ビジネスイベントがファーストクラスの概念としてコードに表現されるため、ドメインエキスパートとの共通言語（Ubiquitous Language）が促進される。本リポジトリの `defineEvent(type, schema)` による型安全なイベント定義がこれを体現。

---

## デメリット

### 1. 複雑性の増大

CRUD と比較して設計・実装・運用の複雑さが大幅に増す。イベントストア、プロジェクション、サブスクリプション、スナップショットなど管理すべきコンポーネントが多い。チーム全体がイベントソーシングの概念を理解する必要がある。

### 2. 結果整合性（Eventual Consistency）

CQRS と併用する場合、コマンド側とクエリ側の間にラグが生じる。ユーザーが操作した直後に最新状態が反映されない場合があり、UI 設計や期待値管理が難しくなる。

### 3. イベントスキーマの進化（Schema Evolution）

一度保存されたイベントは不変のため、スキーマ変更が困難。

- フィールドの追加・削除・改名時に古いイベントとの互換性維持が必要
- アップキャスティング（upcasting）やバージョニング戦略が不可欠
- 長期運用ではスキーマ進化戦略の設計が重要な課題になる

### 4. ストレージの増大

すべてのイベントを永続化するためデータ量が時間とともに増大する。スナップショット機構を導入して定期的に状態を保存し、古いイベントの再生コストを抑える必要がある。

### 5. 学習曲線

- CRUD モデルからの思考の転換が必要
- イベント設計のベストプラクティス（粒度、命名、ペイロード設計）の習得に時間がかかる
- デバッグの手法が従来と異なる（状態ではなくイベント列を追う）

### 6. クエリの複雑さ

現在の状態を取得するためにイベント列を再生するか、事前構築されたプロジェクションを参照する必要がある。アドホックなクエリが難しく、新しいクエリ要件に対してプロジェクションの追加・再構築が必要になる。

### 7. べき等性とイベント順序

- イベントハンドラのべき等性（idempotency）保証が必要
- 分散環境でのイベント順序保証が難しい
- 重複イベントの検出・排除メカニズムが必要

### 8. 外部システムとの統合

外部 API コールなどの副作用を伴う処理をイベントリプレイ時にどう扱うかが課題。リプレイ時に外部呼び出しを再実行してはならないため、サイドエフェクトの分離が必要。

---

## 導入の判断基準

イベントソーシングが**適している**ケース:

- 監査証跡や時間軸クエリがビジネス要件として必須
- ドメインの複雑さがイベント駆動モデルで自然に表現できる
- Undo/Redo や分岐履歴が必要
- 分散環境での競合解決が求められる

イベントソーシングが**過剰**になりやすいケース:

- 単純な CRUD で十分なドメイン
- チームにイベントソーシングの経験がなく、学習コストが見合わない
- リアルタイムの強整合性が必須

---

## 参考文献

### 書籍

| タイトル | 著者 | 年 | 備考 |
|---|---|---|---|
| Domain-Driven Design: Tackling Complexity in the Heart of Software | Eric Evans | 2003 | DDD の原典。ドメインイベントの概念的基盤 |
| Patterns of Enterprise Application Architecture | Martin Fowler | 2002 | エンタープライズパターンの古典 |
| Implementing Domain-Driven Design | Vaughn Vernon | 2013 | DDD の実装ガイド。イベントソーシングの章あり |
| Versioning in an Event Sourced System | Greg Young | 2016 | イベントスキーマ進化に特化。Leanpub で入手可能 |
| Designing Data-Intensive Applications | Martin Kleppmann | 2017 | 分散システムにおけるイベントログ・ストリーム処理を詳解 |
| Building Event-Driven Microservices | Adam Bellemare | 2020 | O'Reilly。イベント駆動マイクロサービスの実践ガイド |

### 記事・ドキュメント

| タイトル | 著者 / 出典 | URL |
|---|---|---|
| Event Sourcing | Martin Fowler | https://martinfowler.com/eaaDev/EventSourcing.html |
| CQRS | Martin Fowler | https://martinfowler.com/bliki/CQRS.html |
| What do you mean by "Event-Driven"? | Martin Fowler | https://martinfowler.com/articles/201701-event-driven.html |
| CQRS Documents | Greg Young | https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf |
| Event Sourcing pattern | Microsoft Azure Architecture Center | https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing |
| CQRS pattern | Microsoft Azure Architecture Center | https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs |
| Introducing Event Sourcing | Microsoft Patterns & Practices | https://learn.microsoft.com/en-us/previous-versions/msp-n-p/jj591559(v=pandp.10) |

### 論文・技術文書

| タイトル | 著者 | 年 | 備考 |
|---|---|---|---|
| The Log: What every software engineer should know about real-time data's unifying abstraction | Jay Kreps | 2013 | イベントログの理論的基盤。LinkedIn Engineering Blog |
| Life Beyond Distributed Transactions: An Apostate's Opinion | Pat Helland | 2007 | 分散トランザクションの限界とイベント駆動の必要性 |

### ツール・フレームワーク

| 名称 | URL | 備考 |
|---|---|---|
| EventStoreDB | https://www.eventstore.com/ | Greg Young 開発のイベントソーシング専用 DB |
| Axon Framework | https://developer.axoniq.io/event-sourcing/overview | Java/Kotlin 向け ES フレームワーク |
| Marten | https://martendb.io/ | .NET 向け PostgreSQL ベースの ES ライブラリ |
| Eventuous | https://eventuous.dev/ | .NET 向けイベントソーシングライブラリ |
| Eventuate | https://eventuate.io/ | Chris Richardson によるマイクロサービス向け ES プラットフォーム |
