import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model_type, input_data } = await req.json();

    if (!model_type || !input_data) {
      return new Response(
        JSON.stringify({ error: "Missing model_type or input_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ML_API_URL = Deno.env.get("ML_API_URL");

    if (!ML_API_URL) {
      console.error("ML_API_URL is not configured — returning fallback signal");
      return new Response(
        JSON.stringify({ fallback: true, error: "ML_API_URL is not configured. Using local prediction." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine endpoint based on model type
    let endpoint: string;
    switch (model_type) {
      case "pcos":
        endpoint = '/pcos/predict';
        break;
      case "menopause":
        endpoint = '/menopause/predict';

        break;
      case "cycle":
        endpoint = '/menstrual/predict';
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown model_type: ${model_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const apiUrl = `${ML_API_URL.replace(/\/$/, "")}${endpoint}`;
    console.log(`Calling ML API: ${apiUrl} for model: ${model_type}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input_data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ML API error (${response.status}):`, errorText);
        return new Response(
          JSON.stringify({
            fallback: true,
            error: `ML API returned ${response.status}. Using local prediction.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      console.log(`ML API success for ${model_type}:`, JSON.stringify(result).slice(0, 200));

      return new Response(
        JSON.stringify({ fallback: false, prediction: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
      console.error(`ML API fetch failed:`, errorMessage);

      return new Response(
        JSON.stringify({
          fallback: true,
          error: `ML API unreachable: ${errorMessage}. Using local prediction.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("ml-predict error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
