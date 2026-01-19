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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      case_media: {
        Row: {
          case_id: string
          created_at: string
          id: string
          media_id: string
          position: number
          role: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          media_id: string
          position?: number
          role?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          media_id?: string
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_media_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          created_at: string
          id: string
          owner_profile_id: string
          problem: string | null
          result: string | null
          solution: string | null
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_profile_id: string
          problem?: string | null
          result?: string | null
          solution?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_profile_id?: string
          problem?: string | null
          result?: string | null
          solution?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      media_objects: {
        Row: {
          bucket: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime_type: string | null
          owner_profile_id: string
          path: string
          size_bytes: number | null
          source_url: string | null
          width: number | null
        }
        Insert: {
          bucket: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          owner_profile_id: string
          path: string
          size_bytes?: number | null
          source_url?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          owner_profile_id?: string
          path?: string
          size_bytes?: number | null
          source_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_objects_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_case_links: {
        Row: {
          case_id: string
          id: string
          offer_id: string
          position: number
        }
        Insert: {
          case_id: string
          id?: string
          offer_id: string
          position?: number
        }
        Update: {
          case_id?: string
          id?: string
          offer_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_case_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_case_links_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_media: {
        Row: {
          created_at: string
          id: string
          media_id: string
          offer_id: string
          position: number
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          offer_id: string
          position?: number
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          offer_id?: string
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_media_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_id: string
          created_at: string
          creator_id: string
          currency_code: string
          description: string | null
          id: string
          offer_status: Database["public"]["Enums"]["offer_status"]
          slug: string
          standard_delivery_days: number
          starting_price_cents: number | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          creator_id: string
          currency_code?: string
          description?: string | null
          id?: string
          offer_status?: Database["public"]["Enums"]["offer_status"]
          slug: string
          standard_delivery_days: number
          starting_price_cents?: number | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          creator_id?: string
          currency_code?: string
          description?: string | null
          id?: string
          offer_status?: Database["public"]["Enums"]["offer_status"]
          slug?: string
          standard_delivery_days?: number
          starting_price_cents?: number | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_total: number | null
          buyer_email: string | null
          buyer_id: string | null
          created_at: string
          currency: string | null
          delivered_at: string | null
          delivery_manifest: Json | null
          delivery_message: string | null
          fulfillment_status: string | null
          id: string
          offer_id: string
          package_id: string
          platform_fee_amount: number | null
          seller_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_total?: number | null
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string | null
          delivered_at?: string | null
          delivery_manifest?: Json | null
          delivery_message?: string | null
          fulfillment_status?: string | null
          id?: string
          offer_id: string
          package_id: string
          platform_fee_amount?: number | null
          seller_id: string
          status: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_total?: number | null
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string | null
          delivered_at?: string | null
          delivery_manifest?: Json | null
          delivery_message?: string | null
          fulfillment_status?: string | null
          id?: string
          offer_id?: string
          package_id?: string
          platform_fee_amount?: number | null
          seller_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          delivery_days: number
          description: string
          id: string
          name: string
          offer_id: string
          price_cents: number
          revisions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_days: number
          description: string
          id?: string
          name: string
          offer_id: string
          price_cents: number
          revisions: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_days?: number
          description?: string
          id?: string
          name?: string
          offer_id?: string
          price_cents?: number
          revisions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_media: {
        Row: {
          created_at: string
          id: string
          media_id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          profile_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_media_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          stripe_account_id: string | null
          stripe_onboarding_status: string | null
          updated_at: string
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      solution_case_links: {
        Row: {
          case_id: string
          id: string
          position: number
          solution_id: string
        }
        Insert: {
          case_id: string
          id?: string
          position?: number
          solution_id: string
        }
        Update: {
          case_id?: string
          id?: string
          position?: number
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_case_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_case_links_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          position: number
          solution_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          position?: number
          solution_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          position?: number
          solution_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_links_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_media: {
        Row: {
          created_at: string
          id: string
          media_id: string
          position: number
          role: string
          solution_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          position?: number
          role?: string
          solution_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          position?: number
          role?: string
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_media_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_pricing_items: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          id: string
          position: number
          price_text: string
          solution_id: string
          title: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          position?: number
          price_text: string
          solution_id: string
          title: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          position?: number
          price_text?: string
          solution_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_pricing_items_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          created_at: string
          description: string | null
          featured_offer_ids: string[]
          headline: string | null
          id: string
          owner_id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["solution_status"]
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_offer_ids?: string[]
          headline?: string | null
          id?: string
          owner_id: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["solution_status"]
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_offer_ids?: string[]
          headline?: string | null
          id?: string
          owner_id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["solution_status"]
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solutions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_offer_aggregates: {
        Args: { p_offer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      offer_status: "draft" | "active"
      solution_status: "draft" | "published" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      offer_status: ["draft", "active"],
      solution_status: ["draft", "published", "archived"],
    },
  },
} as const
