# まなぶ君 キャラクターデザイン定義

絵本全体のイラストで「まなぶ君」の見た目を完全に統一するための、画像生成AI向けの設定資料（プロンプト・リファレンス）です。

## 1. 基本設定（Core Identity）
- **名前:** まなぶ (Manabu)
- **年齢:** 7〜9歳くらいの男の子 (A 8-year-old Japanese boy)
- **性格:** 好奇心旺盛、ものづくりが大好き、元気いっぱい (curious, energetic, loves making things)

## 2. 外観の固定要素（Visual Anchors）
一貫性を保つため、以下の服装と特徴を**すべてのイラストで固定**します。

*   **帽子 (Headwear):** 青いキャップ (blue baseball cap)
*   **トップス (Top):** 青と白のボーダー半袖Tシャツ (blue and white striped short-sleeve t-shirt)
*   **ボトムス (Bottom):** カーキ色の半ズボン (khaki shorts)
*   **靴 (Shoes):** 赤いスニーカー (red sneakers)
*   **持ち物 (Accessories):** 黄色いリュックサック (yellow backpack)
*   **髪型・顔 (Hair & Face):** 短い黒髪、ぱっちりとした大きな目 (short black hair, big round eyes)

---

## 3. 画像生成AI（参照用画像作成）向けプロンプト
参照用画像（キャラクターシート）を作成するためのベースプロンプトです。お使いのツール（Niji・Journeyなど）に合わせて調整してご使用ください。

### 英語プロンプト（推奨）
> **[Character concept art, multiple views of the same character]**, a 8-year-old Japanese boy named Manabu, curious and energetic. He has short black hair and big round eyes. He is wearing a **[blue baseball cap]**, a **[blue and white striped short-sleeve t-shirt]**, **[khaki shorts]**, and **[red sneakers]**. He is carrying a **[yellow backpack]**. Anime style, flat color, clean line art, studio ghibli style, white background, character design sheet --ar 16:9 

### 日本語プロンプト（対応AI用）
> **[キャラクター設定画、同一キャラクターの複数アングル]**、7歳〜9歳くらいの好奇心旺盛な男の子。短い黒髪に大きなぱっちりとした目。**[青いキャップ帽]**をかぶり、**[青と白のボーダーの半袖Tシャツ]**、**[カーキ色の半ズボン]**、**[赤いスニーカー]**を履いている。背中には**[黄色いリュックサック]**を背負っている。アニメスタイル、ベタ塗り、きれいな線画、スタジオジブリ風、白背景、キャラクターデザインシート

---

## 4. 今後の進め方（提案）
1. 上記のプロンプトを使って画像生成AIで「基準となる1枚（キャラクターシート）」を生成します。
2. 理想的なまなぶ君の画像ができたら、その画像を**参照画像（Reference Image / cref）**としてAIに読み込ませます。
3. 今後、工場にいる場面や機械を見ている場面を生成する際は、常にその参照画像と上記固定プロンプトを組み合わせて生成することで、全く同じ見た目のまなぶ君をさまざまなページに登場させることができます。

---

## 5. 完成したコンセプトシート（キャラクターシート）
![まなぶくんのコンセプトシート](./ref_manabu.png)
