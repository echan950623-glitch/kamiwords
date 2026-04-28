// 答題 session 狀態由 VisitClient (src/app/shrine/[slug]/visit/visit-client.tsx) 的 local useState 管理
// 此 store 保留供未來跨頁面狀態擴充使用（例如今日全域統計、連勝顯示）

import { create } from 'zustand'

interface AppStore {
  todayCorrect: number
  todayTotal: number
  addSessionResult: (correct: number, total: number) => void
  resetToday: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  todayCorrect: 0,
  todayTotal: 0,
  addSessionResult: (correct, total) =>
    set((state) => ({
      todayCorrect: state.todayCorrect + correct,
      todayTotal: state.todayTotal + total,
    })),
  resetToday: () => set({ todayCorrect: 0, todayTotal: 0 }),
}))
