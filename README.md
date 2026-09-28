# TODO

家族で共有できる TODO アプリです（妊娠までの準備の管理用）。Vercel にデプロイして、スマホのブラウザから使えます。

## できること

- 同じ合言葉でログインした家族で TODO を共有（15秒ごと＋画面を開いたときに同期）
- TODO は「題目」と「詳細」。詳細に貼った URL はリンクになります
- やること / 完了 の一覧表示、編集・削除
- 「おすすめ」から妊娠準備でよくある項目をまとめて追加

## Vercel へのデプロイ手順

1. [Vercel](https://vercel.com/new) でこの GitHub リポジトリをインポートします（設定はそのままで OK）。
2. **データベースを接続**: プロジェクトの **Storage** タブ → **Upstash**（Redis）を選んで作成し、プロジェクトに接続します。
   `KV_REST_API_URL` と `KV_REST_API_TOKEN` が自動で環境変数に追加されます（無料プランで十分です）。
3. **環境変数を設定**: **Settings → Environment Variables** で以下を追加します。

   | 名前 | 例 | 説明 |
   | --- | --- | --- |
   | `FAMILY_PASSCODE` | `sakura2026` | 家族で共有する合言葉。**必ず設定してください**（未設定だとURLを知っている人は誰でも見られます） |

4. **Deployments** から再デプロイ（Redeploy）すると設定が反映されます。
5. 発行された URL と合言葉をパートナーに共有して完成です。スマホでは「ホーム画面に追加」するとアプリのように使えます。

## ローカルで動かす

```bash
npm install
cp .env.example .env.local   # 必要に応じて編集
npm run dev
```

`KV_REST_API_URL` / `KV_REST_API_TOKEN` が未設定の場合はメモリに保存されます（再起動で消えます）。

## 構成

- Next.js 15（App Router）+ TypeScript
- Upstash Redis（`@upstash/redis`）: TODO は1つのハッシュに1件ずつ保存するので、2人が同時に別の項目を編集しても上書きされません
- 認証: 合言葉を入力すると、そのハッシュ値を HttpOnly Cookie に保存（1年間有効）。`src/middleware.ts` で全ページ・API を保護

---

※ おすすめ項目は一般的な情報をもとにしたものです。体のことは医師・専門家にご相談ください。
