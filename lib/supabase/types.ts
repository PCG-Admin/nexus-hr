export type UserRole = 'employee' | 'manager' | 'admin' | 'ceo'
export type LeaveStatus = 'pending' | 'pending_ceo' | 'approved' | 'rejected' | 'cancelled'
export type AccrualType = 'annual' | 'monthly' | 'fixed'
export type Department = 'engineering' | 'sales' | 'marketing' | 'hr' | 'finance' | 'operations'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          department: Department | null
          role: UserRole
          manager_id: string | null
          employee_number: string | null
          hire_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          department?: Department | null
          role?: UserRole
          manager_id?: string | null
          employee_number?: string | null
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          department?: Department | null
          role?: UserRole
          manager_id?: string | null
          employee_number?: string | null
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_types: {
        Row: {
          id: string
          name: string
          description: string | null
          default_days_per_year: number
          accrual_type: AccrualType
          requires_documentation: boolean
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          default_days_per_year?: number
          accrual_type?: AccrualType
          requires_documentation?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          default_days_per_year?: number
          accrual_type?: AccrualType
          requires_documentation?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_balances: {
        Row: {
          id: string
          user_id: string
          leave_type_id: string
          total_days: number
          used_days: number
          year: number
          last_accrued_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type_id: string
          total_days?: number
          used_days?: number
          year: number
          last_accrued_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leave_type_id?: string
          total_days?: number
          used_days?: number
          year?: number
          last_accrued_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          user_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          days_requested: number
          reason: string | null
          status: LeaveStatus
          reviewer_id: string | null
          reviewer_notes: string | null
          reviewed_at: string | null
          manager_reviewer_id: string | null
          manager_reviewed_at: string | null
          document_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          days_requested: number
          reason?: string | null
          status?: LeaveStatus
          reviewer_id?: string | null
          reviewer_notes?: string | null
          reviewed_at?: string | null
          manager_reviewer_id?: string | null
          manager_reviewed_at?: string | null
          document_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leave_type_id?: string
          start_date?: string
          end_date?: string
          days_requested?: number
          reason?: string | null
          status?: LeaveStatus
          reviewer_id?: string | null
          reviewer_notes?: string | null
          reviewed_at?: string | null
          manager_reviewer_id?: string | null
          manager_reviewed_at?: string | null
          document_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      public_holidays: {
        Row: {
          id: string
          name: string
          date: string
          year: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          reference_id: string | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          reference_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          reference_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
