export type QuestionType = 'kanji_to_zh' | 'zh_to_kanji' | 'kanji_to_kana' | 'spell_kana'

export interface QuizWord {
  id: string
  lemma: string      // 漢字表記
  meaning_zh: string // 中文釋義
  kana: string       // 假名讀音
}

export interface Question {
  word: QuizWord
  type: QuestionType
  stimulus: string     // 題目主體（學習者看到的字）
  prompt: string       // 問題文字（「中文意思是？」）
  choices: string[]    // 4 個選項（已打亂）
  correctIndex: number // 正確答案在 choices 的位置
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pickDistractors(correct: string, pool: string[], count = 3): string[] {
  const len = correct.length
  const candidates = pool.filter(s => s !== correct)
  // 優先抽長度相近（±1 字元 或 0.5x ~ 1.5x），避免「一」這種太短的 distractor
  const near = candidates.filter(s => {
    const diff = Math.abs(s.length - len)
    return diff <= 1 || (s.length >= len * 0.5 && s.length <= len * 1.5)
  })
  const far = candidates.filter(s => {
    const diff = Math.abs(s.length - len)
    return diff > 1 && (s.length < len * 0.5 || s.length > len * 1.5)
  })
  const sorted = [...shuffle(near), ...shuffle(far)]
  return sorted.slice(0, count)
}

function pickKanaDistractors(correctKana: string, pool: string[], count = 3): string[] {
  const len = correctKana.length
  // 優先抽長度相近的（±2 字元）
  const near = pool.filter(k => k !== correctKana && Math.abs(k.length - len) <= 2)
  const far = pool.filter(k => k !== correctKana && Math.abs(k.length - len) > 2)
  const sorted = [...shuffle(near), ...shuffle(far)]
  return sorted.slice(0, count)
}

function buildChoices(
  correct: string,
  distractors: string[]
): { choices: string[]; correctIndex: number } {
  const all = shuffle([correct, ...distractors.slice(0, 3)])
  return { choices: all, correctIndex: all.indexOf(correct) }
}

export function generateQuestion(
  word: QuizWord,
  pool: QuizWord[],
  type: QuestionType
): Question {
  switch (type) {
    case 'kanji_to_zh': {
      const distractors = pickDistractors(
        word.meaning_zh,
        pool.map(w => w.meaning_zh)
      )
      const { choices, correctIndex } = buildChoices(word.meaning_zh, distractors)
      return {
        word,
        type,
        stimulus: `${word.lemma}（${word.kana}）`,
        prompt: '中文意思是？',
        choices,
        correctIndex,
      }
    }

    case 'zh_to_kanji': {
      const isKanaOnly = word.lemma === word.kana
      const distractors = pickDistractors(
        word.lemma,
        pool.map(w => w.lemma)
      )
      const { choices, correctIndex } = buildChoices(word.lemma, distractors)
      return {
        word,
        type,
        stimulus: word.meaning_zh,
        prompt: isKanaOnly ? '日文寫法是？' : '漢字是？',
        choices,
        correctIndex,
      }
    }

    case 'kanji_to_kana': {
      const isKanaOnly = word.lemma === word.kana
      const distractors = pickKanaDistractors(
        word.kana,
        pool.map(w => w.kana)
      )
      const { choices, correctIndex } = buildChoices(word.kana, distractors)
      return {
        word,
        type,
        stimulus: isKanaOnly ? word.meaning_zh : word.lemma,
        prompt: isKanaOnly ? '中文意思的假名讀音？' : '假名讀音是？',
        choices,
        correctIndex,
      }
    }

    case 'spell_kana': {
      // MVP：同 kanji_to_kana 邏輯，以中文為刺激詞
      const distractors = pickKanaDistractors(
        word.kana,
        pool.map(w => w.kana)
      )
      const { choices, correctIndex } = buildChoices(word.kana, distractors)
      return {
        word,
        type,
        stimulus: word.meaning_zh,
        prompt: '假名拼寫是？',
        choices,
        correctIndex,
      }
    }
  }
}

const ALL_TYPES: QuestionType[] = ['kanji_to_zh', 'zh_to_kanji', 'kanji_to_kana', 'spell_kana']

export function generateSessionQuestions(
  sessionWords: QuizWord[],
  pool: QuizWord[]
): Question[] {
  // 先排列所有類型，確保每種至少出現一次
  const typeSequence = shuffle([...ALL_TYPES])
  return sessionWords.map((word, i) => {
    const type = typeSequence[i % typeSequence.length]
    return generateQuestion(word, pool, type)
  })
}
