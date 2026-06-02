export type UserRole = 'admin' | 'co_admin' | 'player'
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'cancelled'
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled'
export type RosterStatus = 'active' | 'inactive'
export type JerseyStatus = 'pending' | 'paid' | 'delivered'
export type TournamentFormat = 'round_robin' | 'knockout'
export type TournamentStatus = 'draft' | 'active' | 'finished' | 'cancelled'
export type TransactionType = 'income' | 'expense'
export type TransactionCategory =
    | 'monthly_fee'
    | 'guest_fee'
    | 'bbq'
    | 'jersey'
    | 'field_rental'
    | 'equipment'
    | 'other'

export interface User {
    id: string
    name: string
    nickname?: string | null
    email: string
    role: UserRole
    photo_url?: string | null
    birth_date?: Date | null
    phone?: string | null
    position?: string | null
    is_goalkeeper: boolean
    is_active: boolean
    invited_at?: Date | null
    first_login_at?: Date | null
    created_at: Date
    updated_at: Date
}

export interface GuestPlayer {
    id: string
    name: string
    phone?: string | null
    linked_user_id?: string | null
    created_at: Date
}

export interface Match {
    id: string
    match_date: Date
    location?: string | null
    status: MatchStatus
    tournament_id?: string | null
    created_by: string
    created_at: Date
}

export interface MonthlyFee {
    id: string
    user_id: string
    month: number
    year: number
    amount: number
    status: PaymentStatus
    paid_at?: Date | null
    notes?: string | null
    created_at: Date
}

export interface FinancialTransaction {
    id: string
    type: TransactionType
    category: TransactionCategory
    amount: number
    description: string
    reference_date: Date
    user_id?: string | null
    guest_player_id?: string | null
    created_by: string
    created_at: Date
}

export interface Tournament {
    id: string
    name: string
    format: TournamentFormat
    status: TournamentStatus
    is_special_event: boolean
    start_date?: Date | null
    end_date?: Date | null
    description?: string | null
    created_by: string
    created_at: Date
}

export interface PlayerRating {
    id: string
    user_id: string
    speed: number
    finishing: number
    passing: number
    dribbling: number
    defense: number
    overall?: number | null
    updated_at: Date
}

export interface MonthlyAward {
    id: string
    month: number
    year: number
    mvp_user_id?: string | null
    top_scorer_user_id?: string | null
    best_gk_user_id?: string | null
    most_present_user_id?: string | null
    top_streak_user_id?: string | null
    created_at: Date
}