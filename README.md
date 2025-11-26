# annotab (v0.2.0)

ブラウザで表データ・テキスト・Markdownにコメントを付けて回収する軽量ツールです。CSV/TSV/テキスト/Markdownを開けます（Numbers/Excelは今後対応予定）。出力はデフォルトでYAML。

## 使い方

```bash
npx annotab <file> [--port 3000] [--encoding utf8|shift_jis|...]
```

- ブラウザが自動で起動します（macOS: `open` / Linux: `xdg-open` / Windows: `start`）。
- セルをクリックしてコメント入力。タブを閉じるか「コメント送信して終了」で送信すると、サーバーは標準出力にコメントJSONを出して終了します。
- 文字コードはUTF-8を前提としますが、`--encoding` で指定、または `chardet` による簡易自動判定で `Shift_JIS` / `CP932` なども開けます。

## 機能
- 列・行の固定（sticky）
- 列ヘッダクリックで即時フィルタ（空/非空・含む/含まない・解除）
- 列幅ドラッグ調整・横幅フィット
- ホットリロード（ファイル更新をwatchしてブラウザにSSE通知）
- テキスト/Markdown: 行番号でコメント、Markdownは上部プレビュー表示
- コメント出力: YAML（file/mode/row/col/value/text等）

## 開発メモ
- 本体は `cli.js` 単体。
- 今後: Excel/Numbers対応、シート選択オプション、フィルタプリセット拡充など。
