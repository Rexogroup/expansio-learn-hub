import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  platform: 'instantly' | 'emailbison';
  apiKey: string;
}

interface ValidationResponse {
  valid: boolean;
  error?: string;
  accountInfo?: {
    email?: string;
    workspace?: string;
    accountCount?: number;
  };
}

async function validateInstantly(apiKey: string): Promise<ValidationResponse> {
  try {
    // Test the API key by fetching accounts
    const response = await fetch('https://api.instantly.ai/api/v2/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Instantly API error:', response.status, errorText);
      
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key. Please check your Instantly.ai API key.' };
      }
      if (response.status === 403) {
        return { valid: false, error: 'API access denied. Make sure you have a Growth plan or higher.' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      valid: true,
      accountInfo: {
        accountCount: Array.isArray(data) ? data.length : data.items?.length || 0,
      },
    };
  } catch (error: unknown) {
    console.error('Instantly validation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `Connection failed: ${message}` };
  }
}

async function validateEmailBison(apiKey: string): Promise<ValidationResponse> {
  try {
    // Test the API key by fetching user info
    const response = await fetch('https://send.expansio.io/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailBison API error:', response.status, errorText);
      
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key. Please check your EmailBison API token.' };
      }
      if (response.status === 403) {
        return { valid: false, error: 'API access denied. Make sure your token has proper permissions.' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      valid: true,
      accountInfo: {
        email: data.email || data.username,
        workspace: data.workspace_name || data.organization,
      },
    };
  } catch (error: unknown) {
    console.error('EmailBison validation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `Connection failed: ${message}` };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, apiKey }: ValidationRequest = await req.json();

    if (!platform || !apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Platform and API key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['instantly', 'emailbison'].includes(platform)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid platform. Must be "instantly" or "emailbison"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: ValidationResponse;

    if (platform === 'instantly') {
      result = await validateInstantly(apiKey);
    } else {
      result = await validateEmailBison(apiKey);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
