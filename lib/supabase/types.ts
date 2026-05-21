export type UserRole        = "employee" | "line_manager" | "hr_manager" | "executive" | "system_admin"
export type LeaveStatus     = "pending" | "pending_ceo" | "approved" | "rejected" | "cancelled"
export type EmploymentType  = "permanent" | "fixed_term" | "probation"
export type DisciplinaryType   = "verbal_warning" | "written_warning" | "final_warning" | "dismissal"
export type DisciplinaryStatus = "draft" | "finalised"
export type CycleType    = "monthly" | "quarterly" | "biannual" | "annual"
export type ReviewStatus = "draft" | "submitted" | "manager_reviewed" | "hr_approved"

export type Database = {
  public: {
    Tables: {

      // ── employees ──────────────────────────────────────────────────────
      employees: {
        Row: {
          id:                             string
          email:                          string
          first_name:                     string
          last_name:                      string
          employee_number:                string | null
          role:                           UserRole
          department:                     string | null
          grade:                          number | null
          job_title:                      string | null
          employment_type:                EmploymentType | null
          hire_date:                      string | null
          manager_id:                     string | null
          phone:                          string | null
          personal_email:                 string | null
          address:                        string | null
          city:                           string | null
          postal_code:                    string | null
          emergency_contact_name:         string | null
          emergency_contact_phone:        string | null
          emergency_contact_relationship: string | null
          id_number:                      string | null
          date_of_birth:                  string | null
          is_active:                      boolean
          created_at:                     string
          updated_at:                     string
        }
        Insert: {
          id:                              string
          email:                           string
          first_name:                      string
          last_name:                       string
          employee_number?:                string | null
          role?:                           UserRole
          department?:                     string | null
          grade?:                          number | null
          job_title?:                      string | null
          employment_type?:                EmploymentType | null
          hire_date?:                      string | null
          manager_id?:                     string | null
          phone?:                          string | null
          personal_email?:                 string | null
          address?:                        string | null
          city?:                           string | null
          postal_code?:                    string | null
          emergency_contact_name?:         string | null
          emergency_contact_phone?:        string | null
          emergency_contact_relationship?: string | null
          id_number?:                      string | null
          date_of_birth?:                  string | null
          is_active?:                      boolean
          created_at?:                     string
          updated_at?:                     string
        }
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>
        Relationships: []
      }

      // ── leave_types ────────────────────────────────────────────────────
      leave_types: {
        Row: {
          id:           string
          name:         string
          default_days: number
          color:        string | null
          is_active:    boolean
          created_at:   string
        }
        Insert: {
          id?:          string
          name:         string
          default_days: number
          color?:       string | null
          is_active?:   boolean
          created_at?:  string
        }
        Update: Partial<Database["public"]["Tables"]["leave_types"]["Insert"]>
        Relationships: []
      }

      // ── leave_balances ─────────────────────────────────────────────────
      leave_balances: {
        Row: {
          id:            string
          user_id:       string
          leave_type_id: string
          total_days:    number
          used_days:     number
          year:          number
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:           string
          user_id:       string
          leave_type_id: string
          total_days:    number
          used_days?:    number
          year:          number
          created_at?:   string
          updated_at?:   string
        }
        Update: Partial<Database["public"]["Tables"]["leave_balances"]["Insert"]>
        Relationships: []
      }

      // ── leave_requests ─────────────────────────────────────────────────
      leave_requests: {
        Row: {
          id:                  string
          user_id:             string
          leave_type_id:       string
          start_date:          string
          end_date:            string
          days_requested:      number
          reason:              string | null
          status:              LeaveStatus
          is_override:         boolean
          reviewer_id:         string | null
          reviewer_notes:      string | null
          reviewed_at:         string | null
          manager_reviewer_id: string | null
          manager_reviewed_at: string | null
          document_url:        string | null
          created_at:          string
          updated_at:          string
        }
        Insert: {
          id?:                  string
          user_id:              string
          leave_type_id:        string
          start_date:           string
          end_date:             string
          days_requested:       number
          reason?:              string | null
          status?:              LeaveStatus
          is_override?:         boolean
          reviewer_id?:         string | null
          reviewer_notes?:      string | null
          reviewed_at?:         string | null
          manager_reviewer_id?: string | null
          manager_reviewed_at?: string | null
          document_url?:        string | null
          created_at?:          string
          updated_at?:          string
        }
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Insert"]>
        Relationships: []
      }

      // ── disciplinary_records ───────────────────────────────────────────
      disciplinary_records: {
        Row: {
          id:            string
          employee_id:   string
          type:          DisciplinaryType
          incident_date: string
          hearing_date:  string | null
          description:   string
          outcome:       string | null
          status:        DisciplinaryStatus
          document_url:  string | null
          created_by:    string
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:           string
          employee_id:   string
          type:          DisciplinaryType
          incident_date: string
          hearing_date?: string | null
          description:   string
          outcome?:      string | null
          status?:       DisciplinaryStatus
          document_url?: string | null
          created_by:    string
          created_at?:   string
          updated_at?:   string
        }
        Update: Partial<Database["public"]["Tables"]["disciplinary_records"]["Insert"]>
        Relationships: []
      }

      // ── disciplinary_audit ─────────────────────────────────────────────
      disciplinary_audit: {
        Row: {
          id:         string
          record_id:  string
          action:     string
          actor_id:   string
          actor_name: string
          timestamp:  string
          changes:    unknown[]
        }
        Insert: {
          id?:        string
          record_id:  string
          action:     string
          actor_id:   string
          actor_name: string
          timestamp?: string
          changes?:   unknown[]
        }
        Update: Partial<Database["public"]["Tables"]["disciplinary_audit"]["Insert"]>
        Relationships: []
      }

      // ── notifications ──────────────────────────────────────────────────
      notifications: {
        Row: {
          id:         string
          user_id:    string
          title:      string
          message:    string
          type:       string
          link:       string | null
          read:       boolean
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          title:       string
          message:     string
          type?:       string
          link?:       string | null
          read?:       boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
        Relationships: []
      }

      // ── public_holidays ────────────────────────────────────────────────
      public_holidays: {
        Row: {
          id:         string
          name:       string
          date:       string
          year:       number
          created_at: string
        }
        Insert: {
          id?:         string
          name:        string
          date:        string
          year:        number
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["public_holidays"]["Insert"]>
        Relationships: []
      }

      // ── performance_cycles ─────────────────────────────────────────────
      performance_cycles: {
        Row: {
          id:         string
          name:       string
          type:       CycleType
          start_date: string
          end_date:   string
          year:       number
          is_active:  boolean
          created_at: string
        }
        Insert: {
          id?:         string
          name:        string
          type:        CycleType
          start_date:  string
          end_date:    string
          year:        number
          is_active?:  boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["performance_cycles"]["Insert"]>
        Relationships: []
      }

      // ── performance_reviews ────────────────────────────────────────────
      performance_reviews: {
        Row: {
          id:                     string
          employee_id:            string
          cycle_id:               string
          status:                 ReviewStatus
          kpis:                   unknown[]
          employee_notes:         string | null
          submitted_at:           string | null
          manager_reviewer_id:    string | null
          manager_notes:          string | null
          manager_reviewed_at:    string | null
          hr_reviewer_id:         string | null
          hr_notes:               string | null
          hr_approved_at:         string | null
          incentive_gate_cleared: boolean
          created_at:             string
          updated_at:             string
        }
        Insert: {
          id?:                     string
          employee_id:             string
          cycle_id:                string
          status?:                 ReviewStatus
          kpis?:                   unknown[]
          employee_notes?:         string | null
          submitted_at?:           string | null
          manager_reviewer_id?:    string | null
          manager_notes?:          string | null
          manager_reviewed_at?:    string | null
          hr_reviewer_id?:         string | null
          hr_notes?:               string | null
          hr_approved_at?:         string | null
          incentive_gate_cleared?: boolean
          created_at?:             string
          updated_at?:             string
        }
        Update: Partial<Database["public"]["Tables"]["performance_reviews"]["Insert"]>
        Relationships: []
      }

    }

    Views: Record<never, never>

    Functions: {
      my_role: { Args: Record<never, never>; Returns: string }
    }

    Enums: Record<never, never>
  }
}
