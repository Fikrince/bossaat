import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

type Payload = { subject?: string; category?: string; message?: string };

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Auth yapılandırması eksik." }, { status: 503 });
  }
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
      },
    },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  let body: Payload;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const subject = String(body.subject || "").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 3000);
  const category = String(body.category || "other").trim();
  if (subject.length < 3 || message.length < 10 || !["support", "complaint", "suggestion", "other"].includes(category)) {
    return NextResponse.json({ error: "Eksik veya geçersiz destek bilgisi." }, { status: 400 });
  }

  const results: { email: string; whatsapp: string } = { email: "not_configured", whatsapp: "not_configured" };
  const categoryLabel = ({ support: "Destek", complaint: "Şikâyet", suggestion: "Öneri", other: "Diğer" } as Record<string,string>)[category];

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL;
  const fromEmail = process.env.SUPPORT_FROM_EMAIL;
  if (resendKey && notifyEmail && fromEmail) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [notifyEmail],
          subject: `BOŞSAAT yeni ${categoryLabel.toLocaleLowerCase("tr-TR")}: ${subject}`,
          text: `Yeni destek mesajı\n\nTür: ${categoryLabel}\nKonu: ${subject}\nGönderen e-posta: ${user.email || "Belirtilmemiş"}\nKullanıcı ID: ${user.id}\n\nMesaj:\n${message}\n`,
        }),
      });
      results.email = response.ok ? "sent" : "failed";
    } catch { results.email = "failed"; }
  }

  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const waTo = process.env.SUPPORT_WHATSAPP_TO;
  const waTemplate = process.env.WHATSAPP_TEMPLATE_NAME;
  const waLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "tr";
  const waVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (waToken && waPhoneId && waTo && waTemplate && waVersion) {
    try {
      const response = await fetch(`https://graph.facebook.com/${waVersion}/${waPhoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waTo,
          type: "template",
          template: {
            name: waTemplate,
            language: { code: waLanguage },
            components: [{ type: "body", parameters: [
              { type: "text", text: categoryLabel },
              { type: "text", text: subject },
              { type: "text", text: message.slice(0, 900) },
            ] }],
          },
        }),
      });
      results.whatsapp = response.ok ? "sent" : "failed";
    } catch { results.whatsapp = "failed"; }
  }
  return NextResponse.json({ notifications: results });
}
