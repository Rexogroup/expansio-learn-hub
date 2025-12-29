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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agency_profiles: {
        Row: {
          affiliate_commission: string | null
          agency_name: string
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          location: string | null
          logo_url: string | null
          minimum_project_value: string | null
          open_to_collaborations: boolean
          profile_views: number
          social_links: Json | null
          tagline: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website_url: string | null
          whitelabel_pricing: string | null
        }
        Insert: {
          affiliate_commission?: string | null
          agency_name: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          logo_url?: string | null
          minimum_project_value?: string | null
          open_to_collaborations?: boolean
          profile_views?: number
          social_links?: Json | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website_url?: string | null
          whitelabel_pricing?: string | null
        }
        Update: {
          affiliate_commission?: string | null
          agency_name?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          logo_url?: string | null
          minimum_project_value?: string | null
          open_to_collaborations?: boolean
          profile_views?: number
          social_links?: Json | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website_url?: string | null
          whitelabel_pricing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_services: {
        Row: {
          agency_id: string
          category_id: string
          created_at: string
          description: string | null
          id: string
          pricing_model: string | null
          service_name: string | null
        }
        Insert: {
          agency_id: string
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          pricing_model?: string | null
          service_name?: string | null
        }
        Update: {
          agency_id?: string
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          pricing_model?: string | null
          service_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_services_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          arr_value: string | null
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          arr_value?: string | null
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          arr_value?: string | null
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          assigned_to: string | null
          client_name: string
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["project_priority"]
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name: string
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          intro_message: string | null
          recipient_id: string
          requester_id: string
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          intro_message?: string | null
          recipient_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          intro_message?: string | null
          recipient_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_published: boolean | null
          order_index: number
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_campaign_metrics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          interested_rate: number | null
          open_rate: number | null
          reply_rate: number | null
          total_emails_sent: number | null
          total_interested: number | null
          total_meetings: number | null
          total_opens: number | null
          total_replies: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          interested_rate?: number | null
          open_rate?: number | null
          reply_rate?: number | null
          total_emails_sent?: number | null
          total_interested?: number | null
          total_meetings?: number | null
          total_opens?: number | null
          total_replies?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          interested_rate?: number | null
          open_rate?: number | null
          reply_rate?: number | null
          total_emails_sent?: number | null
          total_interested?: number | null
          total_meetings?: number | null
          total_opens?: number | null
          total_replies?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_campaign_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_scripts: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          icp_details: Json | null
          id: string
          pain_points: Json | null
          services: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          icp_details?: Json | null
          id?: string
          pain_points?: Json | null
          services?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          icp_details?: Json | null
          id?: string
          pain_points?: Json | null
          services?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_scripts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "script_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_steps: {
        Row: {
          benchmark_kpi_name: string | null
          benchmark_kpi_unit: string | null
          benchmark_kpi_value: number | null
          category: string | null
          created_at: string | null
          description: string | null
          help_content: string | null
          id: string
          name: string
          order_index: number
          required_asset_type: string | null
          step_number: number
          validation_logic: Json | null
        }
        Insert: {
          benchmark_kpi_name?: string | null
          benchmark_kpi_unit?: string | null
          benchmark_kpi_value?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          help_content?: string | null
          id?: string
          name: string
          order_index?: number
          required_asset_type?: string | null
          step_number: number
          validation_logic?: Json | null
        }
        Update: {
          benchmark_kpi_name?: string | null
          benchmark_kpi_unit?: string | null
          benchmark_kpi_value?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          help_content?: string | null
          id?: string
          name?: string
          order_index?: number
          required_asset_type?: string | null
          step_number?: number
          validation_logic?: Json | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          account_verified: boolean
          company: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invite_code: string
          is_active: boolean
          last_name: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          account_verified?: boolean
          company?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          invite_code: string
          is_active?: boolean
          last_name: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          account_verified?: boolean
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          last_name?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      knowledge_base_documents: {
        Row: {
          category: string | null
          created_at: string
          document_type: string
          extracted_content: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean
          mime_type: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          document_type?: string
          extracted_content?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean
          mime_type?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          document_type?: string
          extracted_content?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean
          mime_type?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          order_index: number
          section_id: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          order_index?: number
          section_id: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          order_index?: number
          section_id?: string
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_tag_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          lead_email: string | null
          lead_id: string
          raw_payload: Json | null
          tag_id: string
          tag_name: string | null
          tagged_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          lead_email?: string | null
          lead_id: string
          raw_payload?: Json | null
          tag_id: string
          tag_name?: string | null
          tagged_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          lead_email?: string | null
          lead_id?: string
          raw_payload?: Json | null
          tag_id?: string
          tag_name?: string | null
          tagged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          created_at: string
          description: string
          google_doc_url: string | null
          id: string
          order_index: number
          step_number: number
          step_type: string | null
          template_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description: string
          google_doc_url?: string | null
          id?: string
          order_index?: number
          step_number: number
          step_type?: string | null
          template_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          google_doc_url?: string | null
          id?: string
          order_index?: number
          step_number?: number
          step_type?: string | null
          template_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_email_log: {
        Row: {
          body: string
          id: string
          project_id: string
          recipient: string
          sent_at: string
          sent_by: string
          subject: string
        }
        Insert: {
          body: string
          id?: string
          project_id: string
          recipient: string
          sent_at?: string
          sent_by: string
          subject: string
        }
        Update: {
          body?: string
          id?: string
          project_id?: string
          recipient?: string
          sent_at?: string
          sent_by?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_email_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_email_log_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_call_progress: {
        Row: {
          call_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          watched: boolean | null
          watched_at: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_call_progress_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sales_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_calls: {
        Row: {
          brand_id: string | null
          call_label: string | null
          call_sequence: number | null
          created_at: string
          created_by: string
          deal_size: string | null
          description: string | null
          duration: number | null
          id: string
          industry: string | null
          is_featured: boolean | null
          key_moments: Json | null
          notes: string | null
          order_index: number
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          brand_id?: string | null
          call_label?: string | null
          call_sequence?: number | null
          created_at?: string
          created_by: string
          deal_size?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          industry?: string | null
          is_featured?: boolean | null
          key_moments?: Json | null
          notes?: string | null
          order_index?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          brand_id?: string | null
          call_label?: string | null
          call_sequence?: number | null
          created_at?: string
          created_by?: string
          deal_size?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          industry?: string | null
          is_featured?: boolean | null
          key_moments?: Json | null
          notes?: string | null
          order_index?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_calls_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_lead_magnets: {
        Row: {
          category: string | null
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lead_magnets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "script_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      script_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      script_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "script_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      synced_campaigns: {
        Row: {
          bounces: number | null
          campaign_name: string | null
          campaign_status: string | null
          emails_sent: number | null
          external_campaign_id: string
          id: string
          interested_count: number | null
          interested_rate: number | null
          meetings_booked: number | null
          open_rate: number | null
          platform: string
          raw_data: Json | null
          reply_rate: number | null
          synced_at: string | null
          timeline_days: number | null
          unique_opens: number | null
          unique_replies: number | null
          unsubscribes: number | null
          user_id: string
        }
        Insert: {
          bounces?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          emails_sent?: number | null
          external_campaign_id: string
          id?: string
          interested_count?: number | null
          interested_rate?: number | null
          meetings_booked?: number | null
          open_rate?: number | null
          platform: string
          raw_data?: Json | null
          reply_rate?: number | null
          synced_at?: string | null
          timeline_days?: number | null
          unique_opens?: number | null
          unique_replies?: number | null
          unsubscribes?: number | null
          user_id: string
        }
        Update: {
          bounces?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          emails_sent?: number | null
          external_campaign_id?: string
          id?: string
          interested_count?: number | null
          interested_rate?: number | null
          meetings_booked?: number | null
          open_rate?: number | null
          platform?: string
          raw_data?: Json | null
          reply_rate?: number | null
          synced_at?: string | null
          timeline_days?: number | null
          unique_opens?: number | null
          unique_replies?: number | null
          unsubscribes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          affiliate_link: string
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          features: Json | null
          id: string
          is_published: boolean | null
          name: string
          order_index: number
          price: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          affiliate_link: string
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          features?: Json | null
          id?: string
          is_published?: boolean | null
          name: string
          order_index?: number
          price?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_link?: string
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_published?: boolean | null
          name?: string
          order_index?: number
          price?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assets: {
        Row: {
          asset_type: string
          content: Json
          created_at: string | null
          id: string
          parent_asset_id: string | null
          performance_data: Json | null
          status: string | null
          step_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          asset_type: string
          content?: Json
          created_at?: string | null
          id?: string
          parent_asset_id?: string | null
          performance_data?: Json | null
          status?: string | null
          step_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          asset_type?: string
          content?: Json
          created_at?: string | null
          id?: string
          parent_asset_id?: string | null
          performance_data?: Json | null
          status?: string | null
          step_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "user_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assets_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "growth_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_growth_progress: {
        Row: {
          attempts: number | null
          created_at: string | null
          current_kpi_value: number | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
          step_id: string
          updated_at: string | null
          user_id: string
          validated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          current_kpi_value?: number | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          step_id: string
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          current_kpi_value?: number | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_growth_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "growth_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          meetings_tag_id: string | null
          meetings_tag_name: string | null
          platform: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          meetings_tag_id?: string | null
          meetings_tag_name?: string | null
          platform: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          meetings_tag_id?: string | null
          meetings_tag_name?: string | null
          platform?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          step_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_script_profiles: {
        Row: {
          company_description: string | null
          company_name: string | null
          created_at: string
          custom_notes: string | null
          icp_additional_details: string | null
          icp_employee_count: string | null
          icp_location: string | null
          icp_revenue_range: string | null
          icp_tech_stack: string | null
          id: string
          pain_points: Json | null
          services_offered: string | null
          target_industries: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          custom_notes?: string | null
          icp_additional_details?: string | null
          icp_employee_count?: string | null
          icp_location?: string | null
          icp_revenue_range?: string | null
          icp_tech_stack?: string | null
          id?: string
          pain_points?: Json | null
          services_offered?: string | null
          target_industries?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          custom_notes?: string | null
          icp_additional_details?: string | null
          icp_employee_count?: string | null
          icp_location?: string | null
          icp_revenue_range?: string | null
          icp_tech_stack?: string | null
          id?: string
          pain_points?: Json | null
          services_offered?: string | null
          target_industries?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_invite_code: {
        Args: { code: string }
        Returns: {
          email: string
          expires_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          used_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "editor"
      connection_status: "pending" | "accepted" | "declined"
      project_priority: "low" | "medium" | "high" | "urgent"
      project_status:
        | "onboarding"
        | "tech_setup"
        | "scriptwriting"
        | "list_building"
        | "waiting_warmup"
        | "campaign_live"
        | "scaling"
        | "needs_iterations"
      task_status: "pending" | "in_progress" | "completed" | "blocked"
      task_type:
        | "setup"
        | "review"
        | "content"
        | "technical"
        | "communication"
        | "other"
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
      app_role: ["admin", "user", "editor"],
      connection_status: ["pending", "accepted", "declined"],
      project_priority: ["low", "medium", "high", "urgent"],
      project_status: [
        "onboarding",
        "tech_setup",
        "scriptwriting",
        "list_building",
        "waiting_warmup",
        "campaign_live",
        "scaling",
        "needs_iterations",
      ],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      task_type: [
        "setup",
        "review",
        "content",
        "technical",
        "communication",
        "other",
      ],
    },
  },
} as const
