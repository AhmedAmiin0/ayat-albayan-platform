export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string;
          at: string;
          duration_ms: number;
          entity: string | null;
          entity_id: string | null;
          id: string;
          ip: unknown;
          meta: Json;
          method: string;
          route: string;
          status: number;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string;
          at?: string;
          duration_ms?: number;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip?: unknown;
          meta?: Json;
          method: string;
          route: string;
          status: number;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string;
          at?: string;
          duration_ms?: number;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip?: unknown;
          meta?: Json;
          method?: string;
          route?: string;
          status?: number;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      admin_tasks: {
        Row: {
          created_at: string;
          dedup_key: string;
          done_at: string | null;
          done_by: string | null;
          due_at: string | null;
          id: string;
          kind: Database['public']['Enums']['admin_task_kind'];
          subject_id: string;
          subject_type: string;
          title: string | null;
        };
        Insert: {
          created_at?: string;
          dedup_key: string;
          done_at?: string | null;
          done_by?: string | null;
          due_at?: string | null;
          id?: string;
          kind: Database['public']['Enums']['admin_task_kind'];
          subject_id: string;
          subject_type: string;
          title?: string | null;
        };
        Update: {
          created_at?: string;
          dedup_key?: string;
          done_at?: string | null;
          done_by?: string | null;
          due_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['admin_task_kind'];
          subject_id?: string;
          subject_type?: string;
          title?: string | null;
        };
        Relationships: [];
      };
      assistant_adjustments: {
        Row: {
          amount: number;
          assistant_id: string;
          client_request_id: string | null;
          commission_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          effective_month: string;
          id: string;
          kind: string;
          reason: string;
          statement_id: string | null;
        };
        Insert: {
          amount: number;
          assistant_id: string;
          client_request_id?: string | null;
          commission_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          effective_month: string;
          id?: string;
          kind: string;
          reason: string;
          statement_id?: string | null;
        };
        Update: {
          amount?: number;
          assistant_id?: string;
          client_request_id?: string | null;
          commission_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          effective_month?: string;
          id?: string;
          kind?: string;
          reason?: string;
          statement_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assistant_adjustments_assistant_id_fkey';
            columns: ['assistant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_adjustments_commission_id_fkey';
            columns: ['commission_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_commissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_adjustments_commission_id_fkey';
            columns: ['commission_id'];
            isOneToOne: false;
            referencedRelation: 'v_assistant_students';
            referencedColumns: ['commission_id'];
          },
          {
            foreignKeyName: 'assistant_adjustments_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_statements';
            referencedColumns: ['id'];
          },
        ];
      };
      assistant_commissions: {
        Row: {
          amount: number;
          assistant_id: string;
          base_amount: number;
          base_currency: string;
          commission_type: Database['public']['Enums']['assistant_commission_type'];
          created_at: string;
          currency: string;
          earned_at: string;
          id: string;
          rate: number;
          statement_id: string | null;
          status: Database['public']['Enums']['assistant_commission_status'];
          student_id: string;
          subscription_id: string | null;
          updated_at: string;
          void_auto: boolean | null;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount: number;
          assistant_id: string;
          base_amount: number;
          base_currency: string;
          commission_type: Database['public']['Enums']['assistant_commission_type'];
          created_at?: string;
          currency: string;
          earned_at: string;
          id?: string;
          rate: number;
          statement_id?: string | null;
          status?: Database['public']['Enums']['assistant_commission_status'];
          student_id: string;
          subscription_id?: string | null;
          updated_at?: string;
          void_auto?: boolean | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount?: number;
          assistant_id?: string;
          base_amount?: number;
          base_currency?: string;
          commission_type?: Database['public']['Enums']['assistant_commission_type'];
          created_at?: string;
          currency?: string;
          earned_at?: string;
          id?: string;
          rate?: number;
          statement_id?: string | null;
          status?: Database['public']['Enums']['assistant_commission_status'];
          student_id?: string;
          subscription_id?: string | null;
          updated_at?: string;
          void_auto?: boolean | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assistant_commissions_assistant_id_fkey';
            columns: ['assistant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_commissions_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_statements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_commissions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_commissions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'v_assistant_students';
            referencedColumns: ['student_id'];
          },
          {
            foreignKeyName: 'assistant_commissions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'v_student_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_commissions_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: true;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_commissions_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: true;
            referencedRelation: 'v_subscription_balance';
            referencedColumns: ['subscription_id'];
          },
        ];
      };
      assistant_statement_lines: {
        Row: {
          adjustment_id: string | null;
          amount: number;
          commission_id: string | null;
          created_at: string;
          currency: string;
          id: string;
          kind: string;
          statement_id: string;
        };
        Insert: {
          adjustment_id?: string | null;
          amount: number;
          commission_id?: string | null;
          created_at?: string;
          currency: string;
          id?: string;
          kind: string;
          statement_id: string;
        };
        Update: {
          adjustment_id?: string | null;
          amount?: number;
          commission_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          kind?: string;
          statement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assistant_statement_lines_adjustment_id_fkey';
            columns: ['adjustment_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_adjustments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_statement_lines_commission_id_fkey';
            columns: ['commission_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_commissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assistant_statement_lines_commission_id_fkey';
            columns: ['commission_id'];
            isOneToOne: false;
            referencedRelation: 'v_assistant_students';
            referencedColumns: ['commission_id'];
          },
          {
            foreignKeyName: 'assistant_statement_lines_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'assistant_statements';
            referencedColumns: ['id'];
          },
        ];
      };
      assistant_statements: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          assistant_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          method: Database['public']['Enums']['payment_method'] | null;
          month: string;
          note: string | null;
          paid_at: string | null;
          paid_by: string | null;
          receipt_path: string | null;
          status: Database['public']['Enums']['payout_status'];
          totals: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          assistant_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: Database['public']['Enums']['payment_method'] | null;
          month: string;
          note?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          receipt_path?: string | null;
          status?: Database['public']['Enums']['payout_status'];
          totals?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          assistant_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: Database['public']['Enums']['payment_method'] | null;
          month?: string;
          note?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          receipt_path?: string | null;
          status?: Database['public']['Enums']['payout_status'];
          totals?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assistant_statements_assistant_id_fkey';
            columns: ['assistant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assistant_terms: {
        Row: {
          assistant_id: string;
          commission_currency: string | null;
          commission_starts_on: string | null;
          commission_type: Database['public']['Enums']['assistant_commission_type'] | null;
          commission_value: number | null;
          created_at: string;
          salary_amount: number | null;
          salary_currency: string | null;
          salary_starts_on: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assistant_id: string;
          commission_currency?: string | null;
          commission_starts_on?: string | null;
          commission_type?: Database['public']['Enums']['assistant_commission_type'] | null;
          commission_value?: number | null;
          created_at?: string;
          salary_amount?: number | null;
          salary_currency?: string | null;
          salary_starts_on?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assistant_id?: string;
          commission_currency?: string | null;
          commission_starts_on?: string | null;
          commission_type?: Database['public']['Enums']['assistant_commission_type'] | null;
          commission_value?: number | null;
          created_at?: string;
          salary_amount?: number | null;
          salary_currency?: string | null;
          salary_starts_on?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assistant_terms_assistant_id_fkey';
            columns: ['assistant_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          at: string;
          before: Json | null;
          entity: string;
          entity_id: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          entity: string;
          entity_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          entity?: string;
          entity_id?: string;
          id?: string;
        };
        Relationships: [];
      };
      classroom_blocks: {
        Row: {
          blocked_by: string | null;
          created_at: string;
          id: string;
          join_link_id: string | null;
          lesson_id: string;
          user_id: string | null;
        };
        Insert: {
          blocked_by?: string | null;
          created_at?: string;
          id?: string;
          join_link_id?: string | null;
          lesson_id: string;
          user_id?: string | null;
        };
        Update: {
          blocked_by?: string | null;
          created_at?: string;
          id?: string;
          join_link_id?: string | null;
          lesson_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'classroom_blocks_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_blocks_join_link_id_fkey';
            columns: ['join_link_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_join_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_blocks_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_blocks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      classroom_participants: {
        Row: {
          id: string;
          identity: string;
          join_link_id: string | null;
          joined_at: string;
          lesson_id: string;
          name: string;
          role: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          identity: string;
          join_link_id?: string | null;
          joined_at?: string;
          lesson_id: string;
          name: string;
          role: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          identity?: string;
          join_link_id?: string | null;
          joined_at?: string;
          lesson_id?: string;
          name?: string;
          role?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'classroom_participants_join_link_id_fkey';
            columns: ['join_link_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_join_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_participants_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      custom_config: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          key: string;
          label_ar: string;
          label_en: string | null;
          sort: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          key: string;
          label_ar: string;
          label_en?: string | null;
          sort?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          key?: string;
          label_ar?: string;
          label_en?: string | null;
          sort?: number;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          is_draft: boolean;
          method: Database['public']['Enums']['payment_method'] | null;
          paid_on: string | null;
          receipt_path: string | null;
          recurring: boolean;
          template_id: string | null;
          vendor: string | null;
          amount: number;
          category: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          month: string;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          is_draft?: boolean;
          method?: Database['public']['Enums']['payment_method'] | null;
          paid_on?: string | null;
          receipt_path?: string | null;
          recurring?: boolean;
          template_id?: string | null;
          vendor?: string | null;
          amount: number;
          category: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          month: string;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          is_draft?: boolean;
          method?: Database['public']['Enums']['payment_method'] | null;
          paid_on?: string | null;
          receipt_path?: string | null;
          recurring?: boolean;
          template_id?: string | null;
          vendor?: string | null;
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          month?: string;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_category_fkey';
            columns: ['category'];
            isOneToOne: false;
            referencedRelation: 'expense_categories';
            referencedColumns: ['key'];
          },
        ];
      };
      fx_rates: {
        Row: {
          base: string;
          fetched_at: string;
          id: string;
          provider: string;
          provider_updated_at: string;
          quote: string;
          rate: number;
        };
        Insert: {
          base: string;
          fetched_at?: string;
          id?: string;
          provider: string;
          provider_updated_at: string;
          quote: string;
          rate: number;
        };
        Update: {
          base?: string;
          fetched_at?: string;
          id?: string;
          provider?: string;
          provider_updated_at?: string;
          quote?: string;
          rate?: number;
        };
        Relationships: [];
      };
      guardians: {
        Row: {
          country: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone_e164: string;
          profile_id: string | null;
          source: Database['public']['Enums']['lead_source'] | null;
          tz: string;
          updated_at: string;
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone_e164: string;
          profile_id?: string | null;
          source?: Database['public']['Enums']['lead_source'] | null;
          tz?: string;
          updated_at?: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone_e164?: string;
          profile_id?: string | null;
          source?: Database['public']['Enums']['lead_source'] | null;
          tz?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guardians_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      import_items: {
        Row: {
          created_at: string;
          entity: string;
          first_run_id: string;
          id: string;
          last_run_id: string;
          natural_key: string;
          payload_hash: string;
          source_ref: NonNullable<Json>;
          target_id: string | null;
          target_path: string | null;
          target_table: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          entity: string;
          first_run_id: string;
          id?: string;
          last_run_id: string;
          natural_key: string;
          payload_hash: string;
          source_ref?: NonNullable<Json>;
          target_id?: string | null;
          target_path?: string | null;
          target_table: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          entity?: string;
          first_run_id?: string;
          id?: string;
          last_run_id?: string;
          natural_key?: string;
          payload_hash?: string;
          source_ref?: NonNullable<Json>;
          target_id?: string | null;
          target_path?: string | null;
          target_table?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'import_items_first_run_id_fkey';
            columns: ['first_run_id'];
            isOneToOne: false;
            referencedRelation: 'import_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'import_items_last_run_id_fkey';
            columns: ['last_run_id'];
            isOneToOne: false;
            referencedRelation: 'import_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      import_runs: {
        Row: {
          counts: NonNullable<Json>;
          error: string | null;
          finished_at: string | null;
          git_sha: string | null;
          id: string;
          sources: NonNullable<Json>;
          started_at: string;
          status: Database['public']['Enums']['import_run_status'];
          target: string;
        };
        Insert: {
          counts?: NonNullable<Json>;
          error?: string | null;
          finished_at?: string | null;
          git_sha?: string | null;
          id?: string;
          sources?: NonNullable<Json>;
          started_at?: string;
          status?: Database['public']['Enums']['import_run_status'];
          target: string;
        };
        Update: {
          counts?: NonNullable<Json>;
          error?: string | null;
          finished_at?: string | null;
          git_sha?: string | null;
          id?: string;
          sources?: NonNullable<Json>;
          started_at?: string;
          status?: Database['public']['Enums']['import_run_status'];
          target?: string;
        };
        Relationships: [];
      };
      integration_config: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          client_request_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database['public']['Enums']['booking_kind'];
          message_id: string | null;
          mime: string;
          rule_id: string | null;
          size_bytes: number;
          source: string;
          storage_path: string;
        };
        Insert: {
          client_request_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: Database['public']['Enums']['booking_kind'];
          message_id?: string | null;
          mime: string;
          rule_id?: string | null;
          size_bytes: number;
          source: string;
          storage_path: string;
        };
        Update: {
          client_request_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['booking_kind'];
          message_id?: string | null;
          mime?: string;
          rule_id?: string | null;
          size_bytes?: number;
          source?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['last_message_id'];
          },
          {
            foreignKeyName: 'invoices_rule_id_fkey';
            columns: ['rule_id'];
            isOneToOne: false;
            referencedRelation: 'schedule_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      job_applicants: {
        Row: {
          created_at: string;
          created_by: string | null;
          cv_url: string | null;
          from_lead_id: string | null;
          id: string;
          name: string | null;
          notes: string | null;
          phone_e164: string;
          recitation_url: string | null;
          status: Database['public']['Enums']['job_applicant_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          cv_url?: string | null;
          from_lead_id?: string | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          phone_e164: string;
          recitation_url?: string | null;
          status?: Database['public']['Enums']['job_applicant_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          cv_url?: string | null;
          from_lead_id?: string | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          phone_e164?: string;
          recitation_url?: string | null;
          status?: Database['public']['Enums']['job_applicant_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_applicants_from_lead_id_fkey';
            columns: ['from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_applicants_from_lead_id_fkey';
            columns: ['from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['lead_id'];
          },
        ];
      };
      leads: {
        Row: {
          assigned_to: string | null;
          converted_guardian_id: string | null;
          created_at: string;
          created_by: string | null;
          follow_up_note: string | null;
          follow_up_paused: boolean;
          follow_up_paused_by: string | null;
          follow_up_stage: number;
          id: string;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          name: string | null;
          next_follow_up_at: string | null;
          phone_e164: string;
          qualification: NonNullable<Json>;
          source: Database['public']['Enums']['lead_source'];
          status: Database['public']['Enums']['lead_status'];
          tz: string | null;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          converted_guardian_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          follow_up_note?: string | null;
          follow_up_paused?: boolean;
          follow_up_paused_by?: string | null;
          follow_up_stage?: number;
          id?: string;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          name?: string | null;
          next_follow_up_at?: string | null;
          phone_e164: string;
          qualification?: NonNullable<Json>;
          source?: Database['public']['Enums']['lead_source'];
          status?: Database['public']['Enums']['lead_status'];
          tz?: string | null;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          converted_guardian_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          follow_up_note?: string | null;
          follow_up_paused?: boolean;
          follow_up_paused_by?: string | null;
          follow_up_stage?: number;
          id?: string;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          name?: string | null;
          next_follow_up_at?: string | null;
          phone_e164?: string;
          qualification?: NonNullable<Json>;
          source?: Database['public']['Enums']['lead_source'];
          status?: Database['public']['Enums']['lead_status'];
          tz?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_converted_guardian_id_fkey';
            columns: ['converted_guardian_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_converted_guardian_id_fkey';
            columns: ['converted_guardian_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['guardian_id'];
          },
        ];
      };
      lesson_feedback: {
        Row: {
          contact_phone: string | null;
          created_at: string;
          expires_at: string;
          guardian_id: string;
          id: string;
          kind: Database['public']['Enums']['feedback_kind'];
          lesson_id: string;
          note: string | null;
          quick_rated_at: string | null;
          quick_rating: Database['public']['Enums']['feedback_quick_rating'] | null;
          quick_rating_wa_id: string | null;
          rating: number | null;
          recommend: Database['public']['Enums']['feedback_recommend'] | null;
          requested_at: string;
          source: Database['public']['Enums']['feedback_source'];
          student_id: string;
          submitted_at: string | null;
          teacher_id: string;
          token_hash: string | null;
        };
        Insert: {
          contact_phone?: string | null;
          created_at?: string;
          expires_at: string;
          guardian_id: string;
          id?: string;
          kind: Database['public']['Enums']['feedback_kind'];
          lesson_id: string;
          note?: string | null;
          quick_rated_at?: string | null;
          quick_rating?: Database['public']['Enums']['feedback_quick_rating'] | null;
          quick_rating_wa_id?: string | null;
          rating?: number | null;
          recommend?: Database['public']['Enums']['feedback_recommend'] | null;
          requested_at?: string;
          source?: Database['public']['Enums']['feedback_source'];
          student_id: string;
          submitted_at?: string | null;
          teacher_id: string;
          token_hash?: string | null;
        };
        Update: {
          contact_phone?: string | null;
          created_at?: string;
          expires_at?: string;
          guardian_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['feedback_kind'];
          lesson_id?: string;
          note?: string | null;
          quick_rated_at?: string | null;
          quick_rating?: Database['public']['Enums']['feedback_quick_rating'] | null;
          quick_rating_wa_id?: string | null;
          rating?: number | null;
          recommend?: Database['public']['Enums']['feedback_recommend'] | null;
          requested_at?: string;
          source?: Database['public']['Enums']['feedback_source'];
          student_id?: string;
          submitted_at?: string | null;
          teacher_id?: string;
          token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_feedback_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_feedback_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['guardian_id'];
          },
          {
            foreignKeyName: 'lesson_feedback_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'lesson_students';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_feedback_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'v_lesson_sequence';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_feedback_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'v_package_lessons';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_feedback_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_feedback_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      lesson_join_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          lesson_id: string;
          revoked_at: string | null;
          student_id: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          lesson_id: string;
          revoked_at?: string | null;
          student_id?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          lesson_id?: string;
          revoked_at?: string | null;
          student_id?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_join_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_join_links_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_join_links_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_proposals: {
        Row: {
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          lesson_id: string;
          new_lesson_id: string | null;
          note: string | null;
          proposed_starts_at: string;
          status: Database['public']['Enums']['proposal_status'];
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          lesson_id: string;
          new_lesson_id?: string | null;
          note?: string | null;
          proposed_starts_at: string;
          status?: Database['public']['Enums']['proposal_status'];
          teacher_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          lesson_id?: string;
          new_lesson_id?: string | null;
          note?: string | null;
          proposed_starts_at?: string;
          status?: Database['public']['Enums']['proposal_status'];
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_proposals_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_proposals_new_lesson_id_fkey';
            columns: ['new_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_proposals_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_proposals_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      lesson_recordings: {
        Row: {
          deleted_at: string | null;
          egress_id: string | null;
          ended_at: string | null;
          error: string | null;
          file_path: string;
          id: string;
          lesson_id: string | null;
          meeting_id: string | null;
          size_bytes: number | null;
          started_at: string;
          status: string;
          visible_to_student: boolean;
        };
        Insert: {
          deleted_at?: string | null;
          egress_id?: string | null;
          ended_at?: string | null;
          error?: string | null;
          file_path: string;
          id?: string;
          lesson_id?: string | null;
          meeting_id?: string | null;
          size_bytes?: number | null;
          started_at?: string;
          status?: string;
          visible_to_student?: boolean;
        };
        Update: {
          deleted_at?: string | null;
          egress_id?: string | null;
          ended_at?: string | null;
          error?: string | null;
          file_path?: string;
          id?: string;
          lesson_id?: string | null;
          meeting_id?: string | null;
          size_bytes?: number | null;
          started_at?: string;
          status?: string;
          visible_to_student?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_recordings_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_recordings_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_report_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          report_id: string;
          snapshot: NonNullable<Json>;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          report_id: string;
          snapshot: NonNullable<Json>;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          report_id?: string;
          snapshot?: NonNullable<Json>;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_report_versions_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_reports';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_reports: {
        Row: {
          attendance: Database['public']['Enums']['attendance'] | null;
          created_at: string;
          created_by: string | null;
          edited_at: string | null;
          grade_commitment: Database['public']['Enums']['grade'] | null;
          grade_engagement: Database['public']['Enums']['grade'] | null;
          grade_memorization: Database['public']['Enums']['grade'] | null;
          grade_overall: Database['public']['Enums']['grade'] | null;
          grade_recitation: Database['public']['Enums']['grade'] | null;
          grade_revision: Database['public']['Enums']['grade'] | null;
          grade_tajweed: Database['public']['Enums']['grade'] | null;
          homework: string | null;
          id: string;
          lesson_id: string;
          new_memorization: string | null;
          next_plan: string | null;
          notes: string | null;
          pdf_error: string | null;
          pdf_path: string | null;
          pdf_status: Database['public']['Enums']['pdf_status'] | null;
          program: Database['public']['Enums']['program'] | null;
          recited: string | null;
          revision: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['report_status'];
          student_id: string;
          submitted_at: string | null;
          teacher_id: string;
          theory: string | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          attendance?: Database['public']['Enums']['attendance'] | null;
          created_at?: string;
          created_by?: string | null;
          edited_at?: string | null;
          grade_commitment?: Database['public']['Enums']['grade'] | null;
          grade_engagement?: Database['public']['Enums']['grade'] | null;
          grade_memorization?: Database['public']['Enums']['grade'] | null;
          grade_overall?: Database['public']['Enums']['grade'] | null;
          grade_recitation?: Database['public']['Enums']['grade'] | null;
          grade_revision?: Database['public']['Enums']['grade'] | null;
          grade_tajweed?: Database['public']['Enums']['grade'] | null;
          homework?: string | null;
          id?: string;
          lesson_id: string;
          new_memorization?: string | null;
          next_plan?: string | null;
          notes?: string | null;
          pdf_error?: string | null;
          pdf_path?: string | null;
          pdf_status?: Database['public']['Enums']['pdf_status'] | null;
          program?: Database['public']['Enums']['program'] | null;
          recited?: string | null;
          revision?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['report_status'];
          student_id: string;
          submitted_at?: string | null;
          teacher_id: string;
          theory?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          attendance?: Database['public']['Enums']['attendance'] | null;
          created_at?: string;
          created_by?: string | null;
          edited_at?: string | null;
          grade_commitment?: Database['public']['Enums']['grade'] | null;
          grade_engagement?: Database['public']['Enums']['grade'] | null;
          grade_memorization?: Database['public']['Enums']['grade'] | null;
          grade_overall?: Database['public']['Enums']['grade'] | null;
          grade_recitation?: Database['public']['Enums']['grade'] | null;
          grade_revision?: Database['public']['Enums']['grade'] | null;
          grade_tajweed?: Database['public']['Enums']['grade'] | null;
          homework?: string | null;
          id?: string;
          lesson_id?: string;
          new_memorization?: string | null;
          next_plan?: string | null;
          notes?: string | null;
          pdf_error?: string | null;
          pdf_path?: string | null;
          pdf_status?: Database['public']['Enums']['pdf_status'] | null;
          program?: Database['public']['Enums']['program'] | null;
          recited?: string | null;
          revision?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['report_status'];
          student_id?: string;
          submitted_at?: string | null;
          teacher_id?: string;
          theory?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_reports_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'lesson_students';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_reports_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'v_lesson_sequence';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_reports_lesson_id_student_id_fkey';
            columns: ['lesson_id', 'student_id'];
            isOneToOne: true;
            referencedRelation: 'v_package_lessons';
            referencedColumns: ['lesson_id', 'student_id'];
          },
          {
            foreignKeyName: 'lesson_reports_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_reports_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      lesson_students: {
        Row: {
          attendance: Database['public']['Enums']['attendance'] | null;
          chargeable: boolean;
          created_at: string;
          lesson_id: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          attendance?: Database['public']['Enums']['attendance'] | null;
          chargeable?: boolean;
          created_at?: string;
          lesson_id: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          attendance?: Database['public']['Enums']['attendance'] | null;
          chargeable?: boolean;
          created_at?: string;
          lesson_id?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_students_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_students_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          cancel_reason: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          conflicts: Json | null;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          google_event_id: string | null;
          id: string;
          instant: boolean;
          local_date: string | null;
          makeup_of_id: string | null;
          makeup_student_id: string | null;
          meeting_link: string | null;
          override_reason: string | null;
          rescheduled_from_id: string | null;
          room_opened_at: string | null;
          rule_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
          time_edit_reason: string | null;
          time_edit_was: Json | null;
          time_edited_at: string | null;
          updated_at: string;
        };
        Insert: {
          cancel_reason?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          conflicts?: Json | null;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          google_event_id?: string | null;
          id?: string;
          instant?: boolean;
          local_date?: string | null;
          makeup_of_id?: string | null;
          makeup_student_id?: string | null;
          meeting_link?: string | null;
          override_reason?: string | null;
          rescheduled_from_id?: string | null;
          room_opened_at?: string | null;
          rule_id?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
          time_edit_reason?: string | null;
          time_edit_was?: Json | null;
          time_edited_at?: string | null;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          conflicts?: Json | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          google_event_id?: string | null;
          id?: string;
          instant?: boolean;
          local_date?: string | null;
          makeup_of_id?: string | null;
          makeup_student_id?: string | null;
          meeting_link?: string | null;
          override_reason?: string | null;
          rescheduled_from_id?: string | null;
          room_opened_at?: string | null;
          rule_id?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['lesson_status'];
          teacher_id?: string;
          time_edit_reason?: string | null;
          time_edit_was?: Json | null;
          time_edited_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_makeup_of_id_fkey';
            columns: ['makeup_of_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_makeup_student_id_fkey';
            columns: ['makeup_student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_rescheduled_from_id_fkey';
            columns: ['rescheduled_from_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_rule_id_fkey';
            columns: ['rule_id'];
            isOneToOne: false;
            referencedRelation: 'schedule_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      meetings: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          id: string;
          link_token_hash: string | null;
          revoked: boolean;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          link_token_hash?: string | null;
          revoked?: boolean;
          title?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          link_token_hash?: string | null;
          revoked?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_templates: {
        Row: {
          body_ar: string;
          buttons: NonNullable<Json>;
          category: Database['public']['Enums']['template_category'];
          footer_ar: string | null;
          header_format: string | null;
          key: string;
          language: string;
          last_checked_at: string | null;
          last_error: string | null;
          line: Database['public']['Enums']['wa_line'];
          meta_id: string | null;
          meta_name: string;
          params: NonNullable<Json>;
          quality: string | null;
          sales_starter: boolean;
          status: Database['public']['Enums']['template_status'];
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          body_ar: string;
          buttons?: NonNullable<Json>;
          category?: Database['public']['Enums']['template_category'];
          footer_ar?: string | null;
          header_format?: string | null;
          key: string;
          language?: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          line?: Database['public']['Enums']['wa_line'];
          meta_id?: string | null;
          meta_name: string;
          params?: NonNullable<Json>;
          quality?: string | null;
          sales_starter?: boolean;
          status?: Database['public']['Enums']['template_status'];
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          body_ar?: string;
          buttons?: NonNullable<Json>;
          category?: Database['public']['Enums']['template_category'];
          footer_ar?: string | null;
          header_format?: string | null;
          key?: string;
          language?: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          line?: Database['public']['Enums']['wa_line'];
          meta_id?: string | null;
          meta_name?: string;
          params?: NonNullable<Json>;
          quality?: string | null;
          sales_starter?: boolean;
          status?: Database['public']['Enums']['template_status'];
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          attempts: number;
          body: string | null;
          channel: string;
          created_at: string;
          created_by: string | null;
          dedup_key: string | null;
          delivered_at: string | null;
          direction: Database['public']['Enums']['message_direction'];
          error_code: string | null;
          error_text: string | null;
          expires_at: string | null;
          guardian_id: string | null;
          id: string;
          interactive_payload: Json | null;
          lead_id: string | null;
          lesson_id: string | null;
          line: Database['public']['Enums']['wa_line'] | null;
          media_id: string | null;
          media_mime: string | null;
          media_path: string | null;
          next_attempt_at: string | null;
          phone_e164: string;
          read_at: string | null;
          reply_to_wa_id: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          sent_by_teacher_id: string | null;
          sent_manually_at: string | null;
          status: Database['public']['Enums']['message_status'];
          template_key: string | null;
          template_params: Json | null;
          wa_conversation_id: string | null;
          wa_message_id: string | null;
          wa_pricing_category: string | null;
        };
        Insert: {
          attempts?: number;
          body?: string | null;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          dedup_key?: string | null;
          delivered_at?: string | null;
          direction: Database['public']['Enums']['message_direction'];
          error_code?: string | null;
          error_text?: string | null;
          expires_at?: string | null;
          guardian_id?: string | null;
          id?: string;
          interactive_payload?: Json | null;
          lead_id?: string | null;
          lesson_id?: string | null;
          line?: Database['public']['Enums']['wa_line'] | null;
          media_id?: string | null;
          media_mime?: string | null;
          media_path?: string | null;
          next_attempt_at?: string | null;
          phone_e164: string;
          read_at?: string | null;
          reply_to_wa_id?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          sent_by_teacher_id?: string | null;
          sent_manually_at?: string | null;
          status?: Database['public']['Enums']['message_status'];
          template_key?: string | null;
          template_params?: Json | null;
          wa_conversation_id?: string | null;
          wa_message_id?: string | null;
          wa_pricing_category?: string | null;
        };
        Update: {
          attempts?: number;
          body?: string | null;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          dedup_key?: string | null;
          delivered_at?: string | null;
          direction?: Database['public']['Enums']['message_direction'];
          error_code?: string | null;
          error_text?: string | null;
          expires_at?: string | null;
          guardian_id?: string | null;
          id?: string;
          interactive_payload?: Json | null;
          lead_id?: string | null;
          lesson_id?: string | null;
          line?: Database['public']['Enums']['wa_line'] | null;
          media_id?: string | null;
          media_mime?: string | null;
          media_path?: string | null;
          next_attempt_at?: string | null;
          phone_e164?: string;
          read_at?: string | null;
          reply_to_wa_id?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          sent_by_teacher_id?: string | null;
          sent_manually_at?: string | null;
          status?: Database['public']['Enums']['message_status'];
          template_key?: string | null;
          template_params?: Json | null;
          wa_conversation_id?: string | null;
          wa_message_id?: string | null;
          wa_pricing_category?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['guardian_id'];
          },
          {
            foreignKeyName: 'messages_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['lead_id'];
          },
          {
            foreignKeyName: 'messages_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sent_by_teacher_id_fkey';
            columns: ['sent_by_teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sent_by_teacher_id_fkey';
            columns: ['sent_by_teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      payments: {
        Row: {
          fx_rate: number | null;
          invoice_id: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          original_amount: number | null;
          original_currency: string | null;
          amount: number;
          client_request_id: string | null;
          created_at: string;
          currency: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          note: string | null;
          paid_at: string;
          receipt_path: string | null;
          recorded_by: string | null;
          subscription_id: string;
          updated_at: string;
        };
        Insert: {
          fx_rate?: number | null;
          invoice_id?: string | null;
          kind?: Database['public']['Enums']['payment_kind'];
          original_amount?: number | null;
          original_currency?: string | null;
          amount: number;
          client_request_id?: string | null;
          created_at?: string;
          currency: string;
          id?: string;
          method: Database['public']['Enums']['payment_method'];
          note?: string | null;
          paid_at: string;
          receipt_path?: string | null;
          recorded_by?: string | null;
          subscription_id: string;
          updated_at?: string;
        };
        Update: {
          fx_rate?: number | null;
          invoice_id?: string | null;
          kind?: Database['public']['Enums']['payment_kind'];
          original_amount?: number | null;
          original_currency?: string | null;
          amount?: number;
          client_request_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: Database['public']['Enums']['payment_method'];
          note?: string | null;
          paid_at?: string;
          receipt_path?: string | null;
          recorded_by?: string | null;
          subscription_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'v_subscription_balance';
            referencedColumns: ['subscription_id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          disabled_at: string | null;
          disabled_by: string | null;
          disabled_reason: string | null;
          full_name: string;
          id: string;
          locale: string;
          phone_e164: string | null;
          push_tokens: string[];
          role: Database['public']['Enums']['user_role'];
          role_id: string | null;
          tz: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          disabled_at?: string | null;
          disabled_by?: string | null;
          disabled_reason?: string | null;
          full_name: string;
          id: string;
          locale?: string;
          phone_e164?: string | null;
          push_tokens?: string[];
          role: Database['public']['Enums']['user_role'];
          role_id?: string | null;
          tz?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          disabled_at?: string | null;
          disabled_by?: string | null;
          disabled_reason?: string | null;
          full_name?: string;
          id?: string;
          locale?: string;
          phone_e164?: string | null;
          push_tokens?: string[];
          role?: Database['public']['Enums']['user_role'];
          role_id?: string | null;
          tz?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_role_id_fk';
            columns: ['role_id', 'role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id', 'base_role'];
          },
        ];
      };
      push_notifications: {
        Row: {
          body: string;
          created_at: string;
          data: NonNullable<Json>;
          dedup_key: string;
          error: string | null;
          id: string;
          kind: Database['public']['Enums']['push_kind'];
          profile_id: string;
          sent_at: string | null;
          ticket_ids: string[];
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: NonNullable<Json>;
          dedup_key: string;
          error?: string | null;
          id?: string;
          kind: Database['public']['Enums']['push_kind'];
          profile_id: string;
          sent_at?: string | null;
          ticket_ids?: string[];
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          dedup_key?: string;
          error?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['push_kind'];
          profile_id?: string;
          sent_at?: string | null;
          ticket_ids?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notifications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      report_attachments: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          mime: string;
          report_id: string;
          size: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime: string;
          report_id: string;
          size: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime?: string;
          report_id?: string;
          size?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_attachments_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_reports';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission: string;
          role_id: string;
        };
        Insert: {
          permission: string;
          role_id: string;
        };
        Update: {
          permission?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          base_role: Database['public']['Enums']['user_role'];
          created_at: string;
          id: string;
          is_system: boolean;
          key: string;
          name_ar: string;
          name_en: string | null;
        };
        Insert: {
          base_role: Database['public']['Enums']['user_role'];
          created_at?: string;
          id?: string;
          is_system?: boolean;
          key: string;
          name_ar: string;
          name_en?: string | null;
        };
        Update: {
          base_role?: Database['public']['Enums']['user_role'];
          created_at?: string;
          id?: string;
          is_system?: boolean;
          key?: string;
          name_ar?: string;
          name_en?: string | null;
        };
        Relationships: [];
      };
      schedule_rule_students: {
        Row: {
          created_at: string;
          rule_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          rule_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          rule_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedule_rule_students_rule_id_fkey';
            columns: ['rule_id'];
            isOneToOne: false;
            referencedRelation: 'schedule_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedule_rule_students_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      schedule_rules: {
        Row: {
          byday: number[];
          client_request_id: string | null;
          created_at: string;
          created_by: string | null;
          created_from_lead_id: string | null;
          duration_min: number;
          ends_on: string | null;
          id: string;
          meeting_link: string | null;
          package: Database['public']['Enums']['package_size'] | null;
          start_time_local: string;
          starts_on: string;
          status: Database['public']['Enums']['schedule_rule_status'];
          teacher_id: string;
          tz: string;
          updated_at: string;
        };
        Insert: {
          byday: number[];
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          duration_min: number;
          ends_on?: string | null;
          id?: string;
          meeting_link?: string | null;
          package?: Database['public']['Enums']['package_size'] | null;
          start_time_local: string;
          starts_on: string;
          status?: Database['public']['Enums']['schedule_rule_status'];
          teacher_id: string;
          tz: string;
          updated_at?: string;
        };
        Update: {
          byday?: number[];
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          duration_min?: number;
          ends_on?: string | null;
          id?: string;
          meeting_link?: string | null;
          package?: Database['public']['Enums']['package_size'] | null;
          start_time_local?: string;
          starts_on?: string;
          status?: Database['public']['Enums']['schedule_rule_status'];
          teacher_id?: string;
          tz?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedule_rules_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedule_rules_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['lead_id'];
          },
          {
            foreignKeyName: 'schedule_rules_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedule_rules_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      student_assistants: {
        Row: {
          created_at: string;
          created_by: string | null;
          profile_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          profile_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          profile_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_assistants_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_assistants_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_assistants_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      student_join_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          revoked_at: string | null;
          student_id: string;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          student_id: string;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          student_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_join_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_join_links_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      student_merges: {
        Row: {
          at: string;
          id: string;
          kept_id: string;
          merged_by: string | null;
          merged_id: string;
          snapshot: NonNullable<Json>;
        };
        Insert: {
          at?: string;
          id?: string;
          kept_id: string;
          merged_by?: string | null;
          merged_id: string;
          snapshot?: NonNullable<Json>;
        };
        Update: {
          at?: string;
          id?: string;
          kept_id?: string;
          merged_by?: string | null;
          merged_id?: string;
          snapshot?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'student_merges_kept_id_fkey';
            columns: ['kept_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      students: {
        Row: {
          age: number | null;
          brought_at: string | null;
          brought_by: string | null;
          code: string | null;
          code_seq: number;
          created_at: string;
          created_by: string | null;
          gender: Database['public']['Enums']['gender'] | null;
          goal: string | null;
          guardian_id: string;
          id: string;
          level: string | null;
          meeting_link_override: string | null;
          memorized: string | null;
          name: string;
          name_normalized: string;
          notes: string | null;
          profile_id: string | null;
          program: Database['public']['Enums']['program'];
          riwaya: string | null;
          status: Database['public']['Enums']['student_status'];
          teacher_gender_pref: Database['public']['Enums']['gender'] | null;
          teacher_id: string | null;
          tz: string;
          updated_at: string;
        };
        Insert: {
          age?: number | null;
          brought_at?: string | null;
          brought_by?: string | null;
          code?: never;
          code_seq?: never;
          created_at?: string;
          created_by?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          goal?: string | null;
          guardian_id: string;
          id?: string;
          level?: string | null;
          meeting_link_override?: string | null;
          memorized?: string | null;
          name: string;
          name_normalized: string;
          notes?: string | null;
          profile_id?: string | null;
          program?: Database['public']['Enums']['program'];
          riwaya?: string | null;
          status?: Database['public']['Enums']['student_status'];
          teacher_gender_pref?: Database['public']['Enums']['gender'] | null;
          teacher_id?: string | null;
          tz?: string;
          updated_at?: string;
        };
        Update: {
          age?: number | null;
          brought_at?: string | null;
          brought_by?: string | null;
          code?: never;
          code_seq?: never;
          created_at?: string;
          created_by?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          goal?: string | null;
          guardian_id?: string;
          id?: string;
          level?: string | null;
          meeting_link_override?: string | null;
          memorized?: string | null;
          name?: string;
          name_normalized?: string;
          notes?: string | null;
          profile_id?: string | null;
          program?: Database['public']['Enums']['program'];
          riwaya?: string | null;
          status?: Database['public']['Enums']['student_status'];
          teacher_gender_pref?: Database['public']['Enums']['gender'] | null;
          teacher_id?: string | null;
          tz?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'students_brought_by_fkey';
            columns: ['brought_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'students_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'students_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'students_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['guardian_id'];
          },
          {
            foreignKeyName: 'students_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'students_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          client_request_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          duration: number;
          fx_date: string | null;
          fx_rate: number | null;
          id: string;
          lessons_total: number;
          notes: string | null;
          package: Database['public']['Enums']['package_size'] | null;
          price: number;
          price_source: NonNullable<Json>;
          renews_on: string | null;
          starts_on: string;
          status: Database['public']['Enums']['subscription_status'];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          duration: number;
          fx_date?: string | null;
          fx_rate?: number | null;
          id?: string;
          lessons_total: number;
          notes?: string | null;
          package?: Database['public']['Enums']['package_size'] | null;
          price: number;
          price_source: NonNullable<Json>;
          renews_on?: string | null;
          starts_on: string;
          status?: Database['public']['Enums']['subscription_status'];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          duration?: number;
          fx_date?: string | null;
          fx_rate?: number | null;
          id?: string;
          lessons_total?: number;
          notes?: string | null;
          package?: Database['public']['Enums']['package_size'] | null;
          price?: number;
          price_source?: NonNullable<Json>;
          renews_on?: string | null;
          starts_on?: string;
          status?: Database['public']['Enums']['subscription_status'];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_availability: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_time: string;
          id: string;
          start_time: string;
          teacher_id: string;
          tz: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_time: string;
          id?: string;
          start_time: string;
          teacher_id: string;
          tz: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string;
          id?: string;
          start_time?: string;
          teacher_id?: string;
          tz?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_availability_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_availability_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teacher_payment_items: {
        Row: {
          amount: number;
          earning_id: string;
          id: string;
          payment_id: string;
        };
        Insert: {
          amount: number;
          earning_id: string;
          id?: string;
          payment_id: string;
        };
        Update: {
          amount?: number;
          earning_id?: string;
          id?: string;
          payment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_payment_items_earning_id_fkey';
            columns: ['earning_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_session_earnings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_payment_items_earning_id_fkey';
            columns: ['earning_id'];
            isOneToOne: false;
            referencedRelation: 'v_teacher_countable_earnings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_payment_items_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_payments';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_payments: {
        Row: {
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          amount: number;
          client_request_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          note: string | null;
          paid_at: string;
          payout_id: string | null;
          receipt_path: string | null;
          teacher_id: string;
        };
        Insert: {
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          amount: number;
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          method: Database['public']['Enums']['payment_method'];
          note?: string | null;
          paid_at: string;
          payout_id?: string | null;
          receipt_path?: string | null;
          teacher_id: string;
        };
        Update: {
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          amount?: number;
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          method?: Database['public']['Enums']['payment_method'];
          note?: string | null;
          paid_at?: string;
          payout_id?: string | null;
          receipt_path?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_payments_payout_id_fkey';
            columns: ['payout_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_payouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_payments_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_payments_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teacher_payouts: {
        Row: {
          method: Database['public']['Enums']['payment_method'] | null;
          note: string | null;
          receipt_path: string | null;
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          breakdown: NonNullable<Json>;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          lessons_count: number;
          month: string;
          paid_at: string | null;
          paid_by: string | null;
          status: Database['public']['Enums']['payout_status'];
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          method?: Database['public']['Enums']['payment_method'] | null;
          note?: string | null;
          receipt_path?: string | null;
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          breakdown?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          lessons_count: number;
          month: string;
          paid_at?: string | null;
          paid_by?: string | null;
          status?: Database['public']['Enums']['payout_status'];
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          method?: Database['public']['Enums']['payment_method'] | null;
          note?: string | null;
          receipt_path?: string | null;
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          breakdown?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          lessons_count?: number;
          month?: string;
          paid_at?: string | null;
          paid_by?: string | null;
          status?: Database['public']['Enums']['payout_status'];
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_payouts_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_payouts_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teacher_session_earnings: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          lesson_id: string;
          minutes: number;
          paid_amount: number;
          rate: number;
          starts_at: string;
          status: Database['public']['Enums']['teacher_earning_status'];
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          lesson_id: string;
          minutes: number;
          paid_amount?: number;
          rate: number;
          starts_at: string;
          status?: Database['public']['Enums']['teacher_earning_status'];
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          lesson_id?: string;
          minutes?: number;
          paid_amount?: number;
          rate?: number;
          starts_at?: string;
          status?: Database['public']['Enums']['teacher_earning_status'];
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_session_earnings_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: true;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_session_earnings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_session_earnings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teacher_thread_reads: {
        Row: {
          phone_e164: string;
          read_at: string;
          teacher_id: string;
        };
        Insert: {
          phone_e164: string;
          read_at: string;
          teacher_id: string;
        };
        Update: {
          phone_e164?: string;
          read_at?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_thread_reads_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_thread_reads_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teacher_time_off: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          reason: string | null;
          starts_at: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_time_off_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_time_off_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      teachers: {
        Row: {
          created_at: string;
          created_by: string | null;
          display_name_ar: string;
          display_name_en: string | null;
          gender: Database['public']['Enums']['gender'];
          google_calendar_id: string | null;
          id: string;
          max_students: number | null;
          meeting_link: string | null;
          mirror_enabled: boolean;
          phone_e164: string | null;
          profile_id: string | null;
          programs: Database['public']['Enums']['program'][];
          rate_30: number | null;
          rate_45: number | null;
          rate_60: number | null;
          rate_90: number | null;
          status: Database['public']['Enums']['teacher_status'];
          tz: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          display_name_ar: string;
          display_name_en?: string | null;
          gender: Database['public']['Enums']['gender'];
          google_calendar_id?: string | null;
          id?: string;
          max_students?: number | null;
          meeting_link?: string | null;
          mirror_enabled?: boolean;
          phone_e164?: string | null;
          profile_id?: string | null;
          programs?: Database['public']['Enums']['program'][];
          rate_30?: number | null;
          rate_45?: number | null;
          rate_60?: number | null;
          rate_90?: number | null;
          status?: Database['public']['Enums']['teacher_status'];
          tz?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          display_name_ar?: string;
          display_name_en?: string | null;
          gender?: Database['public']['Enums']['gender'];
          google_calendar_id?: string | null;
          id?: string;
          max_students?: number | null;
          meeting_link?: string | null;
          mirror_enabled?: boolean;
          phone_e164?: string | null;
          profile_id?: string | null;
          programs?: Database['public']['Enums']['program'][];
          rate_30?: number | null;
          rate_45?: number | null;
          rate_60?: number | null;
          rate_90?: number | null;
          status?: Database['public']['Enums']['teacher_status'];
          tz?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teachers_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      translation_overrides: {
        Row: {
          key: string;
          locale: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          key: string;
          locale: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          key?: string;
          locale?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_activity_log: {
        Row: {
          action: string | null;
          actor_id: string | null;
          actor_name: string | null;
          actor_role: string | null;
          at: string | null;
          duration_ms: number | null;
          entity: string | null;
          entity_id: string | null;
          id: string | null;
          meta: Json | null;
          method: string | null;
          route: string | null;
          status: number | null;
        };
        Relationships: [];
      };
      v_assistant_students: {
        Row: {
          assistant_id: string | null;
          brought_at: string | null;
          code: string | null;
          commission_amount: number | null;
          commission_currency: string | null;
          commission_earned_at: string | null;
          commission_id: string | null;
          commission_status: Database['public']['Enums']['assistant_commission_status'] | null;
          first_paid_at: string | null;
          first_subscription_paid: boolean | null;
          name: string | null;
          student_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'students_brought_by_fkey';
            columns: ['assistant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      v_lesson_sequence: {
        Row: {
          lesson_id: string | null;
          seq: number | null;
          starts_at: string | null;
          student_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_students_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_students_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      v_package_lessons: {
        Row: {
          lesson_id: string | null;
          n: number | null;
          starts_at: string | null;
          student_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_students_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_students_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      v_student_list: {
        Row: {
          code: string | null;
          created_at: string | null;
          guardian_id: string | null;
          has_package: boolean | null;
          has_weekly: boolean | null;
          id: string | null;
          low_balance: boolean | null;
          name: string | null;
          name_normalized: string | null;
          package_remaining: number | null;
          package_unpaid: boolean | null;
          program: Database['public']['Enums']['program'] | null;
          status: Database['public']['Enums']['student_status'] | null;
          teacher_id: string | null;
          tz: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'students_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'students_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
        ];
      };
      v_subscription_balance: {
        Row: {
          ended_at: string | null;
          is_last: boolean | null;
          lessons_total: number | null;
          lessons_used: number | null;
          projected_end_at: string | null;
          remaining: number | null;
          student_id: string | null;
          subscription_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      v_teacher_payable_lessons: {
        Row: {
          amount: number | null;
          earning_id: string | null;
          is_trial: boolean;
          lesson_id: string;
          minutes: number;
          paid_amount: number;
          rate: number | null;
          starts_at: string;
          status: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
        };
        Relationships: [];
      };
      v_teacher_earnings_summary: {
        Row: {
          display_name_ar: string;
          earned: number;
          oldest_unpaid_at: string | null;
          owed: number;
          paid: number;
          sessions: number;
          teacher_id: string;
          unpaid_sessions: number;
        };
        Relationships: [];
      };
      v_teacher_countable_earnings: {
        Row: {
          amount: number | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          lesson_id: string | null;
          minutes: number | null;
          paid_amount: number | null;
          rate: number | null;
          starts_at: string | null;
          status: Database['public']['Enums']['teacher_earning_status'] | null;
          teacher_id: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_session_earnings_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: true;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_session_earnings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_session_earnings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      v_teacher_feedback_avg: {
        Row: {
          avg_rating: number | null;
          n: number | null;
          recommend_yes_pct: number | null;
          teacher_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_feedback_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_feedback_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'v_threads';
            referencedColumns: ['teacher_id'];
          },
        ];
      };
      v_threads: {
        Row: {
          display_name: string | null;
          guardian_id: string | null;
          guardian_name: string | null;
          guardian_tz: string | null;
          last_body: string | null;
          last_chat_inbound_at: string | null;
          last_direction: Database['public']['Enums']['message_direction'] | null;
          last_inbound_at: string | null;
          last_inbound_line: Database['public']['Enums']['wa_line'] | null;
          last_media_mime: string | null;
          last_message_at: string | null;
          last_message_id: string | null;
          last_notifications_inbound_at: string | null;
          last_status: Database['public']['Enums']['message_status'] | null;
          last_template_key: string | null;
          lead_id: string | null;
          lead_name: string | null;
          lead_source: Database['public']['Enums']['lead_source'] | null;
          lead_status: Database['public']['Enums']['lead_status'] | null;
          phone_e164: string | null;
          teacher_id: string | null;
          teacher_name: string | null;
          unread_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_assistant_adjustment: {
        Args: {
          p_actor: string;
          p_amount: number;
          p_assistant: string;
          p_currency: string;
          p_reason: string;
          p_request?: string;
        };
        Returns: string;
      };
      admin_list_users: {
        Args: {
          lim?: number;
          off?: number;
          q?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: string;
        };
        Returns: {
          banned_until: string | null;
          created_at: string;
          disabled_at: string | null;
          email: string | null;
          full_name: string;
          id: string;
          last_sign_in_at: string | null;
          linked_code: string | null;
          linked_id: string | null;
          linked_kind: string | null;
          linked_name: string | null;
          phone_e164: string | null;
          role: Database['public']['Enums']['user_role'];
          role_id: string | null;
          role_key: string | null;
          total: number;
        }[];
      };
      auth_user_id_by_email: { Args: { p_email: string }; Returns: string };
      apply_lesson_changes: { Args: { p: Json }; Returns: undefined };
      approve_assistant_statement: {
        Args: { p_actor: string; p_statement: string };
        Returns: Json;
      };
      assistant_next_open_month: { Args: { p_assistant: string }; Returns: string };
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      booking_result: { Args: { p_rule: string }; Returns: Json };
      build_assistant_statement: { Args: { p_statement: string }; Returns: Json };
      create_booking: { Args: { p_actor: string; p_booking: Json }; Returns: Json };
      create_instant_lesson: { Args: { p_actor: string; p_booking: Json }; Returns: Json };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      earning_status: {
        Args: { p_amount: number; p_paid: number };
        Returns: Database['public']['Enums']['teacher_earning_status'];
      };
      edit_lesson_time: { Args: { p: Json }; Returns: undefined };
      evaluate_assistant_commission: { Args: { p_subscription: string }; Returns: string };
      generate_assistant_statement: {
        Args: { p_actor: string; p_assistant: string; p_month: string };
        Returns: Json;
      };
      generate_rule_lessons: {
        Args: { p_actor: string; p_lessons: Json; p_rule: string };
        Returns: {
          cancel_reason: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          conflicts: Json | null;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          google_event_id: string | null;
          id: string;
          instant: boolean;
          local_date: string | null;
          makeup_of_id: string | null;
          makeup_student_id: string | null;
          meeting_link: string | null;
          override_reason: string | null;
          rescheduled_from_id: string | null;
          room_opened_at: string | null;
          rule_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
          time_edit_reason: string | null;
          time_edit_was: Json | null;
          time_edited_at: string | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'lessons';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      integration_secret_clear: { Args: { p_key: string }; Returns: boolean };
      integration_secret_key_ok: { Args: { p_key: string }; Returns: boolean };
      integration_secret_set: { Args: { p_key: string; p_value: string }; Returns: undefined };
      integration_secrets_read: {
        Args: Record<PropertyKey, never>;
        Returns: {
          key: string;
          value: string;
        }[];
      };
      integration_secrets_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          key: string;
          updated_at: string;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_client_session: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_my_assisted_lesson: { Args: { p_lesson: string }; Returns: boolean };
      is_my_child_lesson: { Args: { p_lesson: string }; Returns: boolean };
      is_my_child_report: { Args: { p_report: string }; Returns: boolean };
      is_my_child_report_pdf: { Args: { p_name: string }; Returns: boolean };
      is_my_lesson: { Args: { p_lesson: string }; Returns: boolean };
      is_my_report: { Args: { p_report: string }; Returns: boolean };
      is_my_report_pdf: { Args: { p_name: string }; Returns: boolean };
      is_my_sales_lesson: { Args: { p_lesson: string }; Returns: boolean };
      lesson_counts_for_pay: {
        Args: { p_rule: string; p_status: Database['public']['Enums']['lesson_status'] };
        Returns: boolean;
      };
      merge_students: {
        Args: { p_actor: string; p_kept: string; p_merged: string };
        Returns: string;
      };
      my_assisted_student_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_sales_guardian_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_sales_lead_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_sales_phones: {
        Args: Record<PropertyKey, never>;
        Returns: {
          phone_e164: string;
        }[];
      };
      my_sales_student_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_student_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_teacher_id: { Args: Record<PropertyKey, never>; Returns: string };
      my_thread_phones: {
        Args: Record<PropertyKey, never>;
        Returns: {
          phone_e164: string;
        }[];
      };
      pay_assistant_statement: {
        Args: { p: Json; p_actor: string; p_statement: string };
        Returns: Json;
      };
      prune_activity_log: { Args: Record<PropertyKey, never>; Returns: number };
      record_teacher_payment: { Args: { p: Json }; Returns: Json };
      reopen_assistant_statement: { Args: { p_actor: string; p_statement: string }; Returns: Json };
      report_of_path: { Args: { p_name: string }; Returns: string };
      resync_teacher_earnings: { Args: { p_teacher?: string }; Returns: number };
      create_recurring_expense_drafts: { Args: { p_month: string }; Returns: number };
      set_assistant_terms: { Args: { p: Json; p_actor: string; p_assistant: string }; Returns: undefined };
      revoke_user_sessions: { Args: { p_user: string }; Returns: number };
      set_role_permissions: { Args: { perms: string[]; role_id: string }; Returns: undefined };
      set_student_brought_by: {
        Args: { p_actor: string; p_assistant: string; p_brought_at?: string; p_student: string };
        Returns: Json;
      };
      set_students_brought_by: {
        Args: { p_actor: string; p_assistant: string | null; p_brought_at?: string; p_students: string[] };
        Returns: Json;
      };
      teacher_rate_for: {
        Args: { p_minutes: number; r30: number; r45: number; r60: number; r90: number };
        Returns: number;
      };
      user_references: {
        Args: { user_id: string };
        Returns: { kind: string; n: number; ref_column: string; ref_table: string }[];
      };
      void_teacher_payment: {
        Args: { p_actor: string; p_payment: string; p_reason: string };
        Returns: Json;
      };
      pay_payout: { Args: { p: Json; p_actor: string; p_payout: string }; Returns: Json };
      unpay_payout: {
        Args: { p_actor: string; p_payout: string; p_reason: string };
        Returns: Json;
      };
      void_assistant_commission: {
        Args: { p_actor: string; p_commission: string; p_reason: string };
        Returns: Json;
      };
      void_assistant_commission_row: {
        Args: { p_actor: string; p_auto: boolean; p_commission: string; p_reason: string };
        Returns: undefined;
      };
      reopen_payout: { Args: { p_actor: string; p_payout: string }; Returns: Json };
      settle_payout_in_ledger: {
        Args: { p_actor: string; p_paid_at: string; p_payout: string };
        Returns: string;
      };
      student_first_paid_at: { Args: { p_student: string }; Returns: string };
      submit_report: { Args: { p: Json }; Returns: Json };
      subscription_full_at: { Args: { p_subscription: string }; Returns: string };
      sync_teacher_earning: { Args: { p_lesson: string }; Returns: undefined };
      teacher_has_student: {
        Args: { p_student_id: string; p_teacher_id: string };
        Returns: boolean;
      };
      teacher_student_ids: { Args: { p_teacher_id: string }; Returns: string[] };
      teacher_thread_phones: {
        Args: { p_teacher_id: string };
        Returns: {
          phone_e164: string;
        }[];
      };
      teacher_unread: {
        Args: { p_phones: string[]; p_teacher_id: string };
        Returns: {
          phone_e164: string;
          unread: number;
        }[];
      };
      unpay_assistant_statement: {
        Args: { p_actor: string; p_reason: string; p_statement: string };
        Returns: Json;
      };
    };
    Enums: {
      admin_task_kind: 'renewal_due' | 'subscription_unpaid';
      assistant_commission_status: 'earned' | 'voided';
      assistant_commission_type: 'percent' | 'fixed';
      attendance: 'on_time' | 'late' | 'excused' | 'absent';
      booking_kind: 'trial' | 'package' | 'makeup';
      payment_kind: 'payment' | 'refund';
      feedback_kind: 'trial' | 'subscription';
      feedback_quick_rating: 'excellent' | 'good' | 'needs_work';
      feedback_recommend: 'yes' | 'maybe' | 'no';
      feedback_source: 'web_link' | 'whatsapp_button';
      gender: 'male' | 'female';
      grade: 'excellent' | 'very_good' | 'good' | 'acceptable' | 'needs_review';
      import_run_status: 'running' | 'succeeded' | 'failed';
      job_applicant_status: 'new' | 'reviewing' | 'interview' | 'accepted' | 'rejected';
      lead_source: 'facebook_ad' | 'instagram_ad' | 'whatsapp_direct' | 'referral' | 'other';
      lead_status:
        | 'new'
        | 'contacted'
        | 'interested_no_slot'
        | 'trial_booked'
        | 'trial_done'
        | 'converted'
        | 'no_reply'
        | 'lost';
      lesson_status:
        | 'scheduled'
        | 'confirmed'
        | 'completed'
        | 'late'
        | 'excused'
        | 'no_show'
        | 'cancelled_by_teacher'
        | 'cancelled_by_admin'
        | 'rescheduled';
      message_direction: 'inbound' | 'outbound';
      message_status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'sent_manually';
      package_size: 'trial' | '4' | '8' | '12' | '16' | '20' | '28';
      payment_method: 'bank' | 'wallet' | 'cash' | 'other';
      payout_status: 'draft' | 'approved' | 'paid';
      pdf_status: 'pending' | 'rendering' | 'ready' | 'failed';
      program: 'quran' | 'arabic' | 'islamic_studies';
      proposal_status: 'pending' | 'approved' | 'rejected';
      push_kind:
        | 'new_lead'
        | 'new_message'
        | 'lesson_needs_confirmation'
        | 'report_submitted'
        | 'reminder_failed'
        | 'payment_due';
      report_status: 'draft' | 'submitted';
      schedule_rule_status: 'active' | 'paused' | 'ended';
      student_status: 'trial' | 'active' | 'pending_renewal' | 'paused' | 'churned';
      subscription_status: 'trial' | 'active' | 'paused' | 'expired' | 'unpaid';
      teacher_earning_status: 'earned' | 'partially_paid' | 'paid';
      teacher_status: 'active' | 'inactive';
      template_category: 'utility' | 'marketing';
      template_status:
        'not_submitted' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled' | 'missing';
      user_role: 'admin' | 'teacher' | 'guardian' | 'assistant' | 'sales' | 'student';
      wa_line: 'notifications' | 'chat';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_task_kind: ['renewal_due', 'subscription_unpaid'],
      assistant_commission_status: ['earned', 'voided'],
      assistant_commission_type: ['percent', 'fixed'],
      attendance: ['on_time', 'late', 'excused', 'absent'],
      booking_kind: ['trial', 'package', 'makeup'],
      payment_kind: ['payment', 'refund'],
      feedback_kind: ['trial', 'subscription'],
      feedback_quick_rating: ['excellent', 'good', 'needs_work'],
      feedback_recommend: ['yes', 'maybe', 'no'],
      feedback_source: ['web_link', 'whatsapp_button'],
      gender: ['male', 'female'],
      grade: ['excellent', 'very_good', 'good', 'acceptable', 'needs_review'],
      import_run_status: ['running', 'succeeded', 'failed'],
      job_applicant_status: ['new', 'reviewing', 'interview', 'accepted', 'rejected'],
      lead_source: ['facebook_ad', 'instagram_ad', 'whatsapp_direct', 'referral', 'other'],
      lead_status: [
        'new',
        'contacted',
        'interested_no_slot',
        'trial_booked',
        'trial_done',
        'converted',
        'no_reply',
        'lost',
      ],
      lesson_status: [
        'scheduled',
        'confirmed',
        'completed',
        'late',
        'excused',
        'no_show',
        'cancelled_by_teacher',
        'cancelled_by_admin',
        'rescheduled',
      ],
      message_direction: ['inbound', 'outbound'],
      message_status: ['queued', 'sent', 'delivered', 'read', 'failed', 'sent_manually'],
      package_size: ['trial', '4', '8', '12', '16', '20', '28'],
      payment_method: ['bank', 'wallet', 'cash', 'other'],
      payout_status: ['draft', 'approved', 'paid'],
      pdf_status: ['pending', 'rendering', 'ready', 'failed'],
      program: ['quran', 'arabic', 'islamic_studies'],
      proposal_status: ['pending', 'approved', 'rejected'],
      push_kind: [
        'new_lead',
        'new_message',
        'lesson_needs_confirmation',
        'report_submitted',
        'reminder_failed',
        'payment_due',
      ],
      report_status: ['draft', 'submitted'],
      schedule_rule_status: ['active', 'paused', 'ended'],
      student_status: ['trial', 'active', 'pending_renewal', 'paused', 'churned'],
      subscription_status: ['trial', 'active', 'paused', 'expired', 'unpaid'],
      teacher_earning_status: ['earned', 'partially_paid', 'paid'],
      teacher_status: ['active', 'inactive'],
      template_category: ['utility', 'marketing'],
      template_status: [
        'not_submitted',
        'pending',
        'approved',
        'rejected',
        'paused',
        'disabled',
        'missing',
      ],
      user_role: ['admin', 'teacher', 'guardian', 'assistant', 'sales', 'student'],
      wa_line: ['notifications', 'chat'],
    },
  },
} as const;
