// Types for the Hirata Postgres schema. Regenerate with
// `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`
// once the Supabase CLI is linked to the project.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "admin";
export type OrderStatus =
  | "pending"
  | "paid"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";
export type Fulfillment = "ship" | "pickup";
export type CustomizationFieldType =
  | "text"
  | "textarea"
  | "number"
  | "dropdown"
  | "file";
export type BannerPosition = "hero" | "strip" | "category";
export type HomeSectionType =
  | "hero_banners"
  | "featured_products"
  | "category_grid"
  | "banner_strip"
  | "custom_html";
export type ProductStatus = "draft" | "active" | "archived";
export type DiscountType = "percent" | "amount";

type Table<R, I = R, U = Partial<I>> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
        },
        {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        }
      >;
      addresses: Table<
        {
          id: string;
          user_id: string;
          label: string;
          recipient: string;
          street: string;
          ext_number: string | null;
          int_number: string | null;
          neighborhood: string | null;
          city: string;
          state: string;
          zip: string;
          phone: string | null;
          is_default: boolean;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          label: string;
          recipient: string;
          street: string;
          ext_number?: string | null;
          int_number?: string | null;
          neighborhood?: string | null;
          city: string;
          state: string;
          zip: string;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
        }
      >;
      branches: Table<
        {
          id: string;
          name: string;
          address: string;
          city: string;
          phone: string | null;
          hours: string | null;
          active: boolean;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          address: string;
          city: string;
          phone?: string | null;
          hours?: string | null;
          active?: boolean;
          created_at?: string;
        }
      >;
      categories: Table<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          sort_order: number;
          image_url: string | null;
          show_in_header: boolean;
          created_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          image_url?: string | null;
          show_in_header?: boolean;
          created_at?: string;
        }
      >;
      products: Table<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          base_price: number;
          category_id: string | null;
          is_customizable: boolean;
          requires_file: boolean;
          status: ProductStatus;
          images: Json;
          template_config: Json | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          base_price?: number;
          category_id?: string | null;
          is_customizable?: boolean;
          requires_file?: boolean;
          status?: ProductStatus;
          images?: Json;
          template_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      product_variants: Table<
        {
          id: string;
          product_id: string;
          name: string;
          price_delta: number;
          sku: string | null;
          stock: number | null;
          sort_order: number;
        },
        {
          id?: string;
          product_id: string;
          name: string;
          price_delta?: number;
          sku?: string | null;
          stock?: number | null;
          sort_order?: number;
        }
      >;
      customization_fields: Table<
        {
          id: string;
          product_id: string;
          type: CustomizationFieldType;
          name: string;
          label: string;
          required: boolean;
          options: Json | null;
          price_delta_rules: Json | null;
          sort_order: number;
        },
        {
          id?: string;
          product_id: string;
          type: CustomizationFieldType;
          name: string;
          label: string;
          required?: boolean;
          options?: Json | null;
          price_delta_rules?: Json | null;
          sort_order?: number;
        }
      >;
      banners: Table<
        {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string;
          link_url: string | null;
          position: BannerPosition;
          sort_order: number;
          active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          category_id: string | null;
        },
        {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url: string;
          link_url?: string | null;
          position?: BannerPosition;
          sort_order?: number;
          active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          category_id?: string | null;
        }
      >;
      product_categories: Table<
        {
          product_id: string;
          category_id: string;
        },
        {
          product_id: string;
          category_id: string;
        }
      >;
      home_sections: Table<
        {
          id: string;
          type: HomeSectionType;
          title: string | null;
          config: Json;
          sort_order: number;
          active: boolean;
        },
        {
          id?: string;
          type: HomeSectionType;
          title?: string | null;
          config?: Json;
          sort_order?: number;
          active?: boolean;
        }
      >;
      carts: Table<
        {
          id: string;
          user_id: string | null;
          guest_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string | null;
          guest_id?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      cart_items: Table<
        {
          id: string;
          cart_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          unit_price: number;
          customization: Json | null;
          uploaded_file_url: string | null;
          preview_url: string | null;
          created_at: string;
        },
        {
          id?: string;
          cart_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          unit_price: number;
          customization?: Json | null;
          uploaded_file_url?: string | null;
          preview_url?: string | null;
          created_at?: string;
        }
      >;
      orders: Table<
        {
          id: string;
          user_id: string;
          status: OrderStatus;
          subtotal: number;
          shipping_cost: number;
          total: number;
          fulfillment: Fulfillment;
          address_snapshot: Json | null;
          branch_id: string | null;
          payment_provider: string | null;
          payment_id: string | null;
          payment_status: string | null;
          tracking_number: string | null;
          carrier: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          status?: OrderStatus;
          subtotal: number;
          shipping_cost?: number;
          total: number;
          fulfillment: Fulfillment;
          address_snapshot?: Json | null;
          branch_id?: string | null;
          payment_provider?: string | null;
          payment_id?: string | null;
          payment_status?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      order_items: Table<
        {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          variant_name: string | null;
          quantity: number;
          unit_price: number;
          customization: Json | null;
          uploaded_file_url: string | null;
          preview_url: string | null;
        },
        {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          variant_name?: string | null;
          quantity: number;
          unit_price: number;
          customization?: Json | null;
          uploaded_file_url?: string | null;
          preview_url?: string | null;
        }
      >;
      promotions: Table<
        {
          id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          value: number;
          conditions: Json | null;
          starts_at: string | null;
          ends_at: string | null;
          usage_limit: number | null;
          times_used: number;
          active: boolean;
        },
        {
          id?: string;
          code: string;
          description?: string | null;
          discount_type: DiscountType;
          value: number;
          conditions?: Json | null;
          starts_at?: string | null;
          ends_at?: string | null;
          usage_limit?: number | null;
          times_used?: number;
          active?: boolean;
        }
      >;
      site_settings: Table<
        {
          key: string;
          value: Json;
          updated_at: string;
        },
        {
          key: string;
          value: Json;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      fulfillment_kind: Fulfillment;
      product_status: ProductStatus;
      customization_field_type: CustomizationFieldType;
      banner_position: BannerPosition;
      home_section_type: HomeSectionType;
      discount_type: DiscountType;
    };
    CompositeTypes: Record<string, never>;
  };
}
