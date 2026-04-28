# 全域 Claude Code memory（個人偏好）

> ⚠️ 這份檔案要**複製到** `C:\Users\echan\.claude\CLAUDE.md`，不是放在這個專案。
>
> 複製方法（PowerShell 一行）：
> ```powershell
> mkdir $HOME\.claude -Force; Copy-Item "C:\Users\echan\Dev\playground\語言學習\setup-global-CLAUDE.md" "$HOME\.claude\CLAUDE.md"
> ```
>
> 複製完之後可以把這個 setup 檔刪掉（也可以保留當備份）。

---

# XunC 個人偏好

## 我是誰

台科大資管系學生，目標畢業前建立穩定被動收入，跳過傳統職場，以**一人公司**模式經營。

**核心價值觀**：槓桿、自由、選擇權。

---

## 互動原則

- **回覆永遠用繁體中文**，技術術語保留英文
- **語氣簡潔直接，不要廢話**
- **不要在 chat / Cowork 執行程式**，叫我去 CLI 操作（除非我明確說「在這邊跑」）
- **程式碼要完整可執行**，不給佔位符或 pseudo code
- **所有 async / IO / 外部 API 包 try-catch + 結構化錯誤日誌**
- **大段程式碼前先確認技術棧版本**
- **能自動完成的不要叫我手動操作**

---

## 技術棧偏好

| 領域 | 首選 |
|---|---|
| 前端 | Next.js 14 App Router + TypeScript + pnpm |
| 樣式 | Tailwind CSS + shadcn/ui |
| 後端 | Supabase（Auth + Postgres + Storage 一套打全棧） |
| CMS | Sanity / Contentful |
| 付款（國際） | Stripe |
| 付款（台灣） | LINE Pay / NewebPay / ECPay |
| 部署 | Vercel |
| 自動化 | n8n + Claude API |

---

## 接案範疇

全端開發、網頁開發。實戰中同步學習報價、合約、專案範疇控管。

---

## 財務目標

- **短期**：大學畢業前月收 NT$1,000,000，被動收入為主
- **長期**：與女友移居中國（蘇州 / 上海），收入需完整負擔雙人生活

---

## 技術方案優先順序

1. **可自動化**
2. **可複製**
3. **低邊際成本**

不滿足這三點的方案，不在我的考慮範圍。

---

## 給 Claude Code 的特別指示

- 我**沒有 CLI 經驗**，遇到指令請給完整可貼上的版本，不要假設我知道
- 卡關時主動建議解法，不要只丟錯誤訊息給我
- 重大決策先列 trade-off 給我選，不要直接幫我下決定
- **結束工作前主動提醒我更新專案的 CLAUDE.md 和 dev-log.md**（這對我很重要，我容易忘記做到哪）
