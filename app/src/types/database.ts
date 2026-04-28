export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      languages: {
        Row: { code: string; name: string }
        Insert: { code: string; name: string }
        Update: { code?: string; name?: string }
      }
      words: {
        Row: {
          id: string
          lang_code: string
          lemma: string
          meaning_zh: string
          meta: Json
          audio_url: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          lang_code: string
          lemma: string
          meaning_zh: string
          meta: Json
          audio_url?: string | null
          source: string
          created_at?: string
        }
        Update: {
          id?: string
          lang_code?: string
          lemma?: string
          meaning_zh?: string
          meta?: Json
          audio_url?: string | null
          source?: string
          created_at?: string
        }
      }
      shrines: {
        Row: {
          id: string
          lang_code: string
          slug: string
          name_jp: string
          name_zh: string
          level: string
          level_order: number
          theme_color: string
          visual_asset: string | null
          unlock_condition: Json | null
        }
        Insert: {
          id?: string
          lang_code: string
          slug: string
          name_jp: string
          name_zh: string
          level: string
          level_order: number
          theme_color: string
          visual_asset?: string | null
          unlock_condition?: Json | null
        }
        Update: {
          id?: string
          lang_code?: string
          slug?: string
          name_jp?: string
          name_zh?: string
          level?: string
          level_order?: number
          theme_color?: string
          visual_asset?: string | null
          unlock_condition?: Json | null
        }
      }
      shrine_words: {
        Row: { shrine_id: string; word_id: string; position: number }
        Insert: { shrine_id: string; word_id: string; position: number }
        Update: { shrine_id?: string; word_id?: string; position?: number }
      }
      user_lanterns: {
        Row: {
          user_id: string
          word_id: string
          shrine_id: string
          ease_factor: number
          interval_days: number
          next_review_at: string | null
          consecutive_correct: number
          total_correct: number
          total_wrong: number
          state: 'new' | 'learning' | 'reviewing' | 'mastered'
          is_lit: boolean
          last_seen_at: string | null
        }
        Insert: {
          user_id: string
          word_id: string
          shrine_id: string
          ease_factor?: number
          interval_days?: number
          next_review_at?: string | null
          consecutive_correct?: number
          total_correct?: number
          total_wrong?: number
          state?: 'new' | 'learning' | 'reviewing' | 'mastered'
          is_lit?: boolean
          last_seen_at?: string | null
        }
        Update: {
          user_id?: string
          word_id?: string
          shrine_id?: string
          ease_factor?: number
          interval_days?: number
          next_review_at?: string | null
          consecutive_correct?: number
          total_correct?: number
          total_wrong?: number
          state?: 'new' | 'learning' | 'reviewing' | 'mastered'
          is_lit?: boolean
          last_seen_at?: string | null
        }
      }
      user_goshuin: {
        Row: { user_id: string; shrine_id: string; obtained_at: string }
        Insert: { user_id: string; shrine_id: string; obtained_at?: string }
        Update: { user_id?: string; shrine_id?: string; obtained_at?: string }
      }
      visits: {
        Row: {
          id: string
          user_id: string
          shrine_id: string
          started_at: string
          ended_at: string | null
          total_questions: number
          correct_count: number
          new_words_count: number
          review_words_count: number
        }
        Insert: {
          id?: string
          user_id: string
          shrine_id: string
          started_at?: string
          ended_at?: string | null
          total_questions?: number
          correct_count?: number
          new_words_count?: number
          review_words_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          shrine_id?: string
          started_at?: string
          ended_at?: string | null
          total_questions?: number
          correct_count?: number
          new_words_count?: number
          review_words_count?: number
        }
      }
      visit_answers: {
        Row: {
          visit_id: string
          word_id: string
          question_type: 'kanji_to_zh' | 'zh_to_kanji' | 'kanji_to_kana' | 'spell_kana'
          is_correct: boolean
          ms_taken: number
          answered_at: string
        }
        Insert: {
          visit_id: string
          word_id: string
          question_type: 'kanji_to_zh' | 'zh_to_kanji' | 'kanji_to_kana' | 'spell_kana'
          is_correct: boolean
          ms_taken: number
          answered_at?: string
        }
        Update: {
          visit_id?: string
          word_id?: string
          question_type?: 'kanji_to_zh' | 'zh_to_kanji' | 'kanji_to_kana' | 'spell_kana'
          is_correct?: boolean
          ms_taken?: number
          answered_at?: string
        }
      }
      user_fox: {
        Row: {
          user_id: string
          stage: number
          evolved_at: string[]
          custom_name: string | null
        }
        Insert: {
          user_id: string
          stage?: number
          evolved_at?: string[]
          custom_name?: string | null
        }
        Update: {
          user_id?: string
          stage?: number
          evolved_at?: string[]
          custom_name?: string | null
        }
      }
      neko_definitions: {
        Row: {
          id: string
          name: string
          rarity: number
          description: string
          unlock_rule: Json
        }
        Insert: {
          id: string
          name: string
          rarity: number
          description: string
          unlock_rule: Json
        }
        Update: {
          id?: string
          name?: string
          rarity?: number
          description?: string
          unlock_rule?: Json
        }
      }
      user_nekos: {
        Row: { user_id: string; neko_id: string; obtained_at: string }
        Insert: { user_id: string; neko_id: string; obtained_at?: string }
        Update: { user_id?: string; neko_id?: string; obtained_at?: string }
      }
      user_streak: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_visit_date: string | null
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_visit_date?: string | null
        }
        Update: {
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_visit_date?: string | null
        }
      }
      user_omikuji: {
        Row: {
          user_id: string
          drawn_at: string
          result: string
          reward: Json
        }
        Insert: {
          user_id: string
          drawn_at: string
          result: string
          reward: Json
        }
        Update: {
          user_id?: string
          drawn_at?: string
          result?: string
          reward?: Json
        }
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    CompositeTypes: Record<never, never>
    Enums: {
      lantern_state: 'new' | 'learning' | 'reviewing' | 'mastered'
      question_type: 'kanji_to_zh' | 'zh_to_kanji' | 'kanji_to_kana' | 'spell_kana'
    }
  }
}

// 方便使用的型別別名
export type Word = Database['public']['Tables']['words']['Row']
export type Shrine = Database['public']['Tables']['shrines']['Row']
export type UserLantern = Database['public']['Tables']['user_lanterns']['Row']
export type UserFox = Database['public']['Tables']['user_fox']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']

export interface WordMeta {
  kana: string
  romaji: string
  pitch?: string
  pos: string
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
}
