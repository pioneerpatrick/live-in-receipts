export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          balance: number
          commission: number | null
          commission_balance: number | null
          commission_received: number | null
          completion_date: string | null
          created_at: string
          created_by: string | null
          discount: number
          id: string
          initial_payment_method: string | null
          installment_months: number | null
          name: string
          next_payment_date: string | null
          notes: string | null
          number_of_plots: number
          payment_period: string | null
          payment_type: string | null
          percent_paid: number | null
          phone: string | null
          plot_number: string
          project_name: string
          sale_date: string | null
          sales_agent: string | null
          status: string | null
          total_paid: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          balance?: number
          commission?: number | null
          commission_balance?: number | null
          commission_received?: number | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          initial_payment_method?: string | null
          installment_months?: number | null
          name: string
          next_payment_date?: string | null
          notes?: string | null
          number_of_plots?: number
          payment_period?: string | null
          payment_type?: string | null
          percent_paid?: number | null
          phone?: string | null
          plot_number: string
          project_name: string
          sale_date?: string | null
          sales_agent?: string | null
          status?: string | null
          total_paid?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          commission?: number | null
          commission_balance?: number | null
          commission_received?: number | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          initial_payment_method?: string | null
          installment_months?: number | null
          name?: string
          next_payment_date?: string | null
          notes?: string | null
          number_of_plots?: number
          payment_period?: string | null
          payment_type?: string | null
          percent_paid?: number | null
          phone?: string | null
          plot_number?: string
          project_name?: string
          sale_date?: string | null
          sales_agent?: string | null
          status?: string | null
          total_paid?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          company_tagline: string | null
          created_at: string
          email: string | null
          email_secondary: string | null
          id: string
          logo_url: string | null
          phone: string | null
          po_box: string | null
          receipt_footer_message: string | null
          receipt_watermark: string | null
          social_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          po_box?: string | null
          receipt_footer_message?: string | null
          receipt_watermark?: string | null
          social_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          po_box?: string | null
          receipt_footer_message?: string | null
          receipt_watermark?: string | null
          social_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      employee_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_name: string
          deduction_type: string
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          start_date: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          deduction_name: string
          deduction_type: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          start_date?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_name?: string
          deduction_type?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          basic_salary: number
          created_at: string
          employee_id: string
          employment_type: string
          full_name: string
          hire_date: string | null
          housing_allowance: number | null
          id: string
          is_active: boolean | null
          job_title: string
          kra_pin: string
          national_id: string
          non_taxable_allowances: number | null
          nssf_number: string | null
          other_taxable_allowances: number | null
          sha_number: string | null
          transport_allowance: number | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number
          created_at?: string
          employee_id: string
          employment_type?: string
          full_name: string
          hire_date?: string | null
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          job_title: string
          kra_pin: string
          national_id: string
          non_taxable_allowances?: number | null
          nssf_number?: string | null
          other_taxable_allowances?: number | null
          sha_number?: string | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number
          created_at?: string
          employee_id?: string
          employment_type?: string
          full_name?: string
          hire_date?: string | null
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          job_title?: string
          kra_pin?: string
          national_id?: string
          non_taxable_allowances?: number | null
          nssf_number?: string | null
          other_taxable_allowances?: number | null
          sha_number?: string | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          agent_id: string | null
          amount: number
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_commission_payout: boolean | null
          notes: string | null
          payment_method: string | null
          recipient: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          is_commission_payout?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recipient?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_commission_payout?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recipient?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          agent_name: string | null
          amount: number
          authorized_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          new_balance: number
          notes: string | null
          payment_date: string
          payment_method: string
          previous_balance: number
          receipt_number: string
        }
        Insert: {
          agent_name?: string | null
          amount: number
          authorized_by?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_balance?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string
          previous_balance?: number
          receipt_number: string
        }
        Update: {
          agent_name?: string | null
          amount?: number
          authorized_by?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_balance?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string
          previous_balance?: number
          receipt_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          basic_salary: number
          bonus: number | null
          created_at: string
          created_by: string | null
          employee_id: string
          gross_pay: number
          housing_allowance: number | null
          housing_levy_employee: number | null
          housing_levy_employer: number | null
          id: string
          insurance_relief: number | null
          is_locked: boolean | null
          net_pay: number
          non_taxable_allowances: number | null
          nssf_employee: number
          nssf_employer: number
          other_deductions: number | null
          other_taxable_allowances: number | null
          overtime_pay: number | null
          pay_period_month: number
          pay_period_year: number
          paye: number
          personal_relief: number | null
          sha_deduction: number
          taxable_income: number
          total_deductions: number
          transport_allowance: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          basic_salary: number
          bonus?: number | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          gross_pay: number
          housing_allowance?: number | null
          housing_levy_employee?: number | null
          housing_levy_employer?: number | null
          id?: string
          insurance_relief?: number | null
          is_locked?: boolean | null
          net_pay: number
          non_taxable_allowances?: number | null
          nssf_employee?: number
          nssf_employer?: number
          other_deductions?: number | null
          other_taxable_allowances?: number | null
          overtime_pay?: number | null
          pay_period_month: number
          pay_period_year: number
          paye?: number
          personal_relief?: number | null
          sha_deduction?: number
          taxable_income: number
          total_deductions: number
          transport_allowance?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          basic_salary?: number
          bonus?: number | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          gross_pay?: number
          housing_allowance?: number | null
          housing_levy_employee?: number | null
          housing_levy_employer?: number | null
          id?: string
          insurance_relief?: number | null
          is_locked?: boolean | null
          net_pay?: number
          non_taxable_allowances?: number | null
          nssf_employee?: number
          nssf_employer?: number
          other_deductions?: number | null
          other_taxable_allowances?: number | null
          overtime_pay?: number | null
          pay_period_month?: number
          pay_period_year?: number
          paye?: number
          personal_relief?: number | null
          sha_deduction?: number
          taxable_income?: number
          total_deductions?: number
          transport_allowance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          plot_number: string
          price: number
          project_id: string
          size: string
          sold_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plot_number: string
          price?: number
          project_id: string
          size: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plot_number?: string
          price?: number
          project_id?: string
          size?: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          buying_price: number | null
          capacity: number
          created_at: string
          description: string | null
          id: string
          location: string
          name: string
          total_plots: number
          updated_at: string
        }
        Insert: {
          buying_price?: number | null
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          location: string
          name: string
          total_plots?: number
          updated_at?: string
        }
        Update: {
          buying_price?: number | null
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          name?: string
          total_plots?: number
          updated_at?: string
        }
        Relationships: []
      }
      statutory_rates: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          rate_name: string
          rate_type: string
          rate_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          rate_name: string
          rate_type: string
          rate_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          rate_name?: string
          rate_type?: string
          rate_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_orphaned_plots: { Args: never; Returns: number }
      get_client_payment_history: {
        Args: { p_client_id: string }
        Returns: {
          balance: number
          client_id: string
          client_name: string
          client_phone: string
          discount: number
          new_balance: number
          payment_amount: number
          payment_date: string
          payment_id: string
          payment_method: string
          percent_paid: number
          plot_number: string
          previous_balance: number
          project_name: string
          receipt_number: string
          total_paid: number
          total_price: number
        }[]
      }
      get_user_full_name: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
