import { getSupabaseConfig, getCorsHeaders } from './_supabaseClient.js';

export async function onRequest(context) {
    try {
        const { request, env } = context;
        const corsHeaders = getCorsHeaders();

        // Handle OPTIONS request for CORS
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // Get Supabase credentials from the central module
        const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
        
        if (!supabaseKey) {
            return new Response(JSON.stringify({
                success: false,
                message: "Missing Supabase API key"
            }), {
                status: 500,
                headers: corsHeaders
            });
        }

        // GET request - Fetch categories
        if (request.method === 'GET') {
            // Fetch categories from Supabase
            const response = await fetch(
                `${supabaseUrl}/rest/v1/menu_categories?select=*&order=DISPLAY_ORDER.asc`,
                {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`
                    }
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Supabase error: ${error}`);
            }
            
            const categories = await response.json();
            
            return new Response(JSON.stringify({
                success: true,
                data: categories
            }), {
                status: 200,
                headers: corsHeaders
            });
        }
        
        // POST request - Create new category
        if (request.method === 'POST') {
            // Parse the category data
            const categoryData = await request.json();
            
            // Validate required fields
            if (!categoryData.NAME) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Category name is required"
                }), {
                    status: 400,
                    headers: corsHeaders
                });
            }
            
            // Add timestamps
            categoryData.CREATED_AT = new Date().toISOString();
            categoryData.UPDATED_AT = new Date().toISOString();
            
            // Create category in Supabase
            const response = await fetch(
                `${supabaseUrl}/rest/v1/menu_categories`,
                {
                    method: 'POST',
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
                throw new Error(`Failed to create category: ${error}`);
            }
            
            const newCategory = await response.json();
            
            return new Response(JSON.stringify({
                success: true,
                message: "Category created successfully",
                data: newCategory[0]
            }), {
                status: 201,
                headers: corsHeaders
            });
        }
        
        // DELETE request - Delete a category
        if (request.method === 'DELETE') {
            // Get the category ID from the URL
            const url = new URL(request.url);
            const parts = url.pathname.split('/');
            const id = parts[parts.length - 1];
            
            if (!id || isNaN(parseInt(id))) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Invalid category ID"
                }), {
                    status: 400,
                    headers: corsHeaders
                });
            }
            
            // Delete the category from Supabase
            const response = await fetch(
                `${supabaseUrl}/rest/v1/menu_categories?CATEGORY_ID=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`
                    }
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to delete category: ${error}`);
            }
            
            return new Response(JSON.stringify({
                success: true,
                message: "Category deleted successfully"
            }), {
                status: 200,
                headers: corsHeaders
            });
        }
        
        // If we get here, it's an unsupported method
        return new Response(JSON.stringify({
            success: false,
            message: "Method not allowed"
        }), {
            status: 405,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Allow": "GET, POST, DELETE, OPTIONS"
            }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}