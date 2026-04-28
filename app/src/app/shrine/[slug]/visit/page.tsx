import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSessionQuestions } from '@/lib/question'
import type { QuizWord } from '@/lib/question'
import { VisitClient } from './visit-client'

const SESSION_SIZE = 10
const MAX_REVIEW = 5

export default async function VisitPage({
  params,
}: {
  params: { slug: string }
}) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 抓神社
    const shrineResult = await supabase
      .from('shrines')
      .select('id, slug, name_jp, name_zh, theme_color')
      .eq('slug', params.slug)
      .single()

    if (shrineResult.error || !shrineResult.data) {
      console.error('【VisitPage】抓神社失敗:', {
        message: shrineResult.error?.message ?? 'data is null',
        slug: params.slug,
        timestamp: new Date().toISOString(),
      })
      redirect('/')
    }

    const shrine = shrineResult.data

    // 抓此神社所有單字 ID（依位置排序）
    const swResult = await supabase
      .from('shrine_words')
      .select('word_id, position')
      .eq('shrine_id', shrine.id)
      .order('position')

    if (swResult.error || !swResult.data?.length) {
      console.error('【VisitPage】抓神社單字失敗:', {
        message: swResult.error?.message ?? '無單字',
        shrine_id: shrine.id,
        timestamp: new Date().toISOString(),
      })
      redirect('/')
    }

    const wordIds = swResult.data.map(sw => sw.word_id)

    // 批次抓單字內容（lemma / meaning_zh / meta.kana）
    const wordsResult = await supabase
      .from('words')
      .select('id, lemma, meaning_zh, meta')
      .in('id', wordIds)

    if (wordsResult.error || !wordsResult.data) {
      console.error('【VisitPage】抓單字內容失敗:', {
        message: wordsResult.error?.message ?? 'data is null',
        timestamp: new Date().toISOString(),
      })
      redirect('/')
    }

    // 抓使用者燈籠（此神社）
    const lanternsResult = await supabase
      .from('user_lanterns')
      .select(
        'word_id, state, next_review_at'
      )
      .eq('user_id', user.id)
      .eq('shrine_id', shrine.id)

    if (lanternsResult.error) {
      console.error('【VisitPage】抓燈籠失敗:', {
        message: lanternsResult.error.message,
        timestamp: new Date().toISOString(),
      })
    }

    const lanternMap = new Map(
      (lanternsResult.data ?? []).map((l: Record<string, unknown>) => [
        l.word_id as string,
        l,
      ])
    )

    // 按神社位置排序建立 QuizWord pool
    const wordDetailMap = new Map(
      wordsResult.data.map((w: Record<string, unknown>) => [w.id as string, w])
    )

    const now = new Date()
    const reviewDueWords: QuizWord[] = []
    const newWords: QuizWord[] = []

    for (const sw of swResult.data) {
      const w = wordDetailMap.get(sw.word_id)
      if (!w) continue

      const meta = (w.meta as Record<string, unknown>) ?? {}
      const kana = (meta.kana as string) ?? ''

      const qw: QuizWord = {
        id: w.id as string,
        lemma: w.lemma as string,
        meaning_zh: w.meaning_zh as string,
        kana,
      }

      const lantern = lanternMap.get(sw.word_id)
      if (!lantern || (lantern as Record<string, unknown>).state === 'new') {
        newWords.push(qw)
      } else {
        const nextReview = (lantern as Record<string, unknown>).next_review_at as string | null
        if (nextReview && new Date(nextReview) <= now) {
          reviewDueWords.push(qw)
        }
      }
    }

    // 選出本次 session 單字：最多 5 個複習 + 補滿新字，合計最多 10 個
    const sessionWords: QuizWord[] = []

    for (const w of reviewDueWords.slice(0, MAX_REVIEW)) {
      sessionWords.push(w)
    }

    const newSlots = Math.min(SESSION_SIZE - sessionWords.length, newWords.length)
    for (const w of newWords.slice(0, newSlots)) {
      sessionWords.push(w)
    }

    if (sessionWords.length === 0) {
      // 今日已全部複習完畢或無單字
      redirect('/')
    }

    // 用所有單字當干擾選項池
    const allWords: QuizWord[] = swResult.data
      .map(sw => {
        const w = wordDetailMap.get(sw.word_id)
        if (!w) return null
        const meta = (w.meta as Record<string, unknown>) ?? {}
        return {
          id: w.id as string,
          lemma: w.lemma as string,
          meaning_zh: w.meaning_zh as string,
          kana: (meta.kana as string) ?? '',
        }
      })
      .filter((w): w is QuizWord => w !== null)

    const questions = generateSessionQuestions(sessionWords, allWords)
    const newWordsCount = sessionWords.filter(
      w => !lanternMap.has(w.id) || (lanternMap.get(w.id) as Record<string, unknown>)?.state === 'new'
    ).length
    const reviewWordsCount = sessionWords.length - newWordsCount

    return (
      <VisitClient
        shrine={{
          id: shrine.id,
          slug: shrine.slug,
          name_jp: shrine.name_jp,
          theme_color: shrine.theme_color,
        }}
        questions={questions}
        newWordsCount={newWordsCount}
        reviewWordsCount={reviewWordsCount}
      />
    )
  } catch (error) {
    console.error('【VisitPage】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    redirect('/')
  }
}
