import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Password reset email request received");

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, userName }: PasswordResetRequest = await req.json();

    if (!email) {
      console.error("Email is required");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Generating password reset link for: ${email}`);

    // Generate password reset link using admin API
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/reset-password`,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resetLink = data.properties?.action_link;
    console.log("Reset link generated successfully");

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "PAI Paraguay <onboarding@resend.dev>",
      to: [email],
      subject: "Restablecimiento de contraseña - PAI Paraguay",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">PAI Paraguay</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Sistema de Gestión de Tickets</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 22px;">Restablecimiento de Contraseña</h2>
                      
                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hola <strong>${userName || 'Usuario'}</strong>,
                      </p>
                      
                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Un administrador ha solicitado restablecer tu contraseña en el sistema de tickets de PAI Paraguay. Haz clic en el botón de abajo para crear una nueva contraseña:
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetLink}" 
                               style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e3a5f 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                              Restablecer Contraseña
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
                      </p>
                      <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                        ${resetLink}
                      </p>
                      
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #a0aec0; font-size: 13px; line-height: 1.5; margin: 0;">
                          ⚠️ Este enlace expirará en 24 horas por razones de seguridad.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} PAI Paraguay - Subsistema de Información
                      </p>
                      <p style="color: #a0aec0; font-size: 12px; margin: 10px 0 0 0;">
                        Este es un correo automático, por favor no responder.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
