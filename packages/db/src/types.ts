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
      expenses: {
        Row: {
          amount: number;
          category: Database['public']['Enums']['expense_category'];
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          month: string;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          category: Database['public']['Enums']['expense_category'];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          month: string;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: Database['public']['Enums']['expense_category'];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          month?: string;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
          local_date: string | null;
          meeting_link: string | null;
          override_reason: string | null;
          rescheduled_from_id: string | null;
          rule_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
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
          local_date?: string | null;
          meeting_link?: string | null;
          override_reason?: string | null;
          rescheduled_from_id?: string | null;
          rule_id?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
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
          local_date?: string | null;
          meeting_link?: string | null;
          override_reason?: string | null;
          rescheduled_from_id?: string | null;
          rule_id?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['lesson_status'];
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
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
          meta_id: string | null;
          meta_name: string;
          params: NonNullable<Json>;
          quality: string | null;
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
          meta_id?: string | null;
          meta_name: string;
          params?: NonNullable<Json>;
          quality?: string | null;
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
          meta_id?: string | null;
          meta_name?: string;
          params?: NonNullable<Json>;
          quality?: string | null;
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
          media_id: string | null;
          media_mime: string | null;
          media_path: string | null;
          next_attempt_at: string | null;
          phone_e164: string;
          read_at: string | null;
          reply_to_wa_id: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
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
          media_id?: string | null;
          media_mime?: string | null;
          media_path?: string | null;
          next_attempt_at?: string | null;
          phone_e164: string;
          read_at?: string | null;
          reply_to_wa_id?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
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
          media_id?: string | null;
          media_mime?: string | null;
          media_path?: string | null;
          next_attempt_at?: string | null;
          phone_e164?: string;
          read_at?: string | null;
          reply_to_wa_id?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
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
        ];
      };
      payments: {
        Row: {
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
          created_at: string;
          full_name: string;
          id: string;
          locale: string;
          phone_e164: string | null;
          push_tokens: string[];
          role: Database['public']['Enums']['user_role'];
          tz: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          locale?: string;
          phone_e164?: string | null;
          push_tokens?: string[];
          role: Database['public']['Enums']['user_role'];
          tz?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          locale?: string;
          phone_e164?: string | null;
          push_tokens?: string[];
          role?: Database['public']['Enums']['user_role'];
          tz?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      teacher_payouts: {
        Row: {
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
    };
    Views: {
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
      v_threads: {
        Row: {
          display_name: string | null;
          guardian_id: string | null;
          guardian_name: string | null;
          guardian_tz: string | null;
          last_body: string | null;
          last_direction: Database['public']['Enums']['message_direction'] | null;
          last_inbound_at: string | null;
          last_media_mime: string | null;
          last_message_at: string | null;
          last_message_id: string | null;
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
      apply_lesson_changes: { Args: { p: Json }; Returns: undefined };
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      booking_result: { Args: { p_rule: string }; Returns: Json };
      create_booking: { Args: { p_actor: string; p_booking: Json }; Returns: Json };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
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
          local_date: string | null;
          meeting_link: string | null;
          override_reason: string | null;
          rescheduled_from_id: string | null;
          rule_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['lesson_status'];
          teacher_id: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'lessons';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_my_child_lesson: { Args: { p_lesson: string }; Returns: boolean };
      is_my_child_report: { Args: { p_report: string }; Returns: boolean };
      is_my_child_report_pdf: { Args: { p_name: string }; Returns: boolean };
      is_my_lesson: { Args: { p_lesson: string }; Returns: boolean };
      is_my_report: { Args: { p_report: string }; Returns: boolean };
      is_my_report_pdf: { Args: { p_name: string }; Returns: boolean };
      merge_students: {
        Args: { p_actor: string; p_kept: string; p_merged: string };
        Returns: string;
      };
      my_student_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_teacher_id: { Args: Record<PropertyKey, never>; Returns: string };
      report_of_path: { Args: { p_name: string }; Returns: string };
      submit_report: { Args: { p: Json }; Returns: Json };
    };
    Enums: {
      admin_task_kind: 'renewal_due' | 'subscription_unpaid';
      attendance: 'on_time' | 'late' | 'excused' | 'absent';
      expense_category: 'ads' | 'content' | 'tools' | 'operations' | 'other';
      gender: 'male' | 'female';
      grade: 'excellent' | 'very_good' | 'good' | 'acceptable' | 'needs_review';
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
      student_status: 'trial' | 'active' | 'paused' | 'churned';
      subscription_status: 'trial' | 'active' | 'paused' | 'expired' | 'unpaid';
      teacher_status: 'active' | 'inactive';
      template_category: 'utility' | 'marketing';
      template_status:
        'not_submitted' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled' | 'missing';
      user_role: 'admin' | 'teacher' | 'guardian';
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
      attendance: ['on_time', 'late', 'excused', 'absent'],
      expense_category: ['ads', 'content', 'tools', 'operations', 'other'],
      gender: ['male', 'female'],
      grade: ['excellent', 'very_good', 'good', 'acceptable', 'needs_review'],
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
      student_status: ['trial', 'active', 'paused', 'churned'],
      subscription_status: ['trial', 'active', 'paused', 'expired', 'unpaid'],
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
      user_role: ['admin', 'teacher', 'guardian'],
    },
  },
} as const;
