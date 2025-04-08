export async function onRequest(context) {
    try {
        const { request, env, params } = context;
        
        if (request.method === 'PUT') {
            // Only handle PUT for updating categories
            const categoryId = params.id;
            
            if (!categoryId) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Category ID is required"
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Get Supabase credentials
            const supabaseUrl = env.SUPABASE_URL || "https://icqbjfixyidhhrpnekdl.supabase.co";
            const supabaseKey = env.SUPABASE_KEY;
            
            if (!supabaseKey) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Missing Supabase API key"
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Parse the category data
            const categoryData = await request.json();
            
            // Validate required fields
            if (!categoryData.NAME) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Category name is required"
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Update timestamp
            categoryData.UPDATED_AT = new Date().toISOString();
            
            // Update category in Supabase
            const response = await fetch(
                `${supabaseUrl}/rest/v1/MENU_CATEGORIES?CATEGORY_ID=eq.${categoryId}`,
                {
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`,
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify(categoryData)
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to update category: ${error}`);
            }
            
            const updatedCategory = await response.json();
            
            if (!updatedCategory || updatedCategory.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Category not found"
                }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            return new Response(JSON.stringify({
                success: true,
                message: "Category updated successfully",
                data: updatedCategory[0]
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else if (request.method === 'DELETE') {
            return onRequestDelete(context);
        } else if (request.method === 'OPTIONS') {
            return onRequestOptions();
        } else {
            return new Response(JSON.stringify({
                success: false,
                message: "Method not allowed"
            }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
  try {
    const { params, env } = context;
    const categoryId = params.id;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Get Supabase credentials
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!categoryId) {
      return new Response(JSON.stringify({
        success: false,
        message: "Category ID is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Deleting category with ID: ${categoryId}`);
    
    // IMPORTANT: Use lowercase table name "menu_categories" instead of "MENU_CATEGORIES"
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/menu_categories?CATEGORY_ID=eq.${categoryId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error("Error deleting category:", errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: `Error deleting category: ${errorText}`
      }), {
        status: deleteResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Category deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error) {
    console.error("Error in category delete:", error);
    
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

// Handle OPTIONS request for CORS
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}