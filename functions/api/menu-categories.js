import { getSupabaseConfig, getCorsHeaders, getSupabase } from './_supabaseClient.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders();

    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Get Supabase client
    const supabase = getSupabase(context);
    const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "Missing Supabase configuration"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Extract ID if present in the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1].match(/^\d+$/) ? pathParts[pathParts.length - 1] : null;
    
    // Handle different HTTP methods
    if (request.method === "GET") {
      // If ID is provided, fetch a specific category
      if (id) {
        const { data, error } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('CATEGORY_ID', id)
          .single();
          
        if (error) {
          return new Response(JSON.stringify({
            success: false,
            message: `Error fetching category: ${error.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        if (!data) {
          return new Response(JSON.stringify({
            success: false,
            message: "Category not found"
          }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: data
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } 
      // Fetch all categories
      else {
        // Check for any query parameters for filtering
        const isActiveFilter = url.searchParams.get('is_active');
        
        let query = supabase.from('menu_categories').select('*');
        
        // Apply filters if provided
        if (isActiveFilter !== null) {
          const isActive = isActiveFilter === 'true';
          query = query.eq('IS_ACTIVE', isActive);
        }
        
        // Order by display order and then name
        query = query.order('DISPLAY_ORDER', { ascending: true }).order('NAME', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) {
          return new Response(JSON.stringify({
            success: false,
            message: `Error fetching categories: ${error.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: data
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } else if (request.method === "POST") {
      // Create a new category
      const categoryData = await request.json();
      
      // Validation
      if (!categoryData.NAME) {
        return new Response(JSON.stringify({
          success: false,
          message: "Category name is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Add timestamps
      const now = new Date().toISOString();
      categoryData.CREATED_AT = now;
      categoryData.UPDATED_AT = now;
      
      // Set defaults
      if (categoryData.IS_ACTIVE === undefined) categoryData.IS_ACTIVE = true;
      if (!categoryData.DISPLAY_ORDER) categoryData.DISPLAY_ORDER = 10;
      
      const { data, error } = await supabase
        .from('menu_categories')
        .insert(categoryData)
        .select();
      
      if (error) {
        return new Response(JSON.stringify({
          success: false,
          message: `Error creating category: ${error.message}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Category created successfully",
        data: data[0]
      }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else if (request.method === "PUT") {
      // Update an existing category
      if (!id) {
        return new Response(JSON.stringify({
          success: false,
          message: "Category ID is required for updates"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const categoryData = await request.json();
      
      // Update timestamp
      categoryData.UPDATED_AT = new Date().toISOString();
      
      // Check if category exists
      const { data: existingCategory, error: checkError } = await supabase
        .from('menu_categories')
        .select('CATEGORY_ID')
        .eq('CATEGORY_ID', id)
        .single();
      
      if (checkError || !existingCategory) {
        return new Response(JSON.stringify({
          success: false,
          message: "Category not found"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Update the category
      const { data, error } = await supabase
        .from('menu_categories')
        .update(categoryData)
        .eq('CATEGORY_ID', id)
        .select();
      
      if (error) {
        return new Response(JSON.stringify({
          success: false,
          message: `Error updating category: ${error.message}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Category updated successfully",
        data: data[0]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else if (request.method === "DELETE") {
      // Delete a category
      if (!id) {
        return new Response(JSON.stringify({
          success: false,
          message: "Category ID is required for deletion"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // First check if any menu items are using this category
      const { data: menuItems, error: checkError } = await supabase
        .from('menu_items')
        .select('ITEM_ID')
        .eq('CATEGORY_ID', id)
        .limit(1);
      
      if (checkError) {
        return new Response(JSON.stringify({
          success: false,
          message: `Error checking category usage: ${checkError.message}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // If menu items are using this category, prevent deletion
      if (menuItems && menuItems.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Cannot delete category: it is being used by one or more menu items"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Delete the category
      const { data, error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('CATEGORY_ID', id)
        .select();
      
      if (error) {
        return new Response(JSON.stringify({
          success: false,
          message: `Error deleting category: ${error.message}`
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // If no records were deleted, category might not exist
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Category not found"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Category deleted successfully",
        data: data[0]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // If method is not supported
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Menu categories API error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}