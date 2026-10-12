import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DICTIONARIES } from "../src/studio/i18n/locales/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const locales = Object.keys(DICTIONARIES);

for (const lang of locales) {
  const dict = DICTIONARIES[lang];
  const e = dict.emails;
  const isRtl = lang === "ar";
  const dirAttr = isRtl ? ' dir="rtl"' : ' dir="ltr"';
  const textAlign = isRtl ? "right" : "left";

  const targetDir = path.join(__dirname, "locales", lang);
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. confirm-signup.html
  const confirmSignupHtml = `<!DOCTYPE html>
<html lang="${lang}"${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Aster Account &bull; StudioOS — ${e.confirm_signup.subject}</title>
  <style>
    :root { color-scheme: light only; }
    body {
      margin: 0; padding: 0; background-color: #08080a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff; -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: separate; }
    a { text-decoration: none; }
    .btn-gold:hover {
      background: linear-gradient(135deg, #ffd466 0%, #e6a728 100%) !important;
      box-shadow: 0 0 25px rgba(242, 179, 61, 0.5) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 15px; background-color: #08080a; background-image: linear-gradient(#08080a, #08080a); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #08080a; background-image: linear-gradient(#08080a, #08080a);">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #0e0e12; background-image: linear-gradient(#0e0e12, #0e0e12); border: 1px solid #232328; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #F2604C 0%, #F2B33D 50%, #2FD4A0 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 22px 40px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(242, 179, 61, 0.08); border: 1px solid rgba(242, 179, 61, 0.3); border-radius: 20px; padding: 5px 14px; margin-bottom: 14px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 10px; font-weight: 700; color: #F2B33D; letter-spacing: 0.14em; text-transform: uppercase;">
                  ${e.confirm_signup.badge}
                </span>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color: #17171d; border: 1px solid #282830; border-radius: 12px; padding: 10px 20px; text-align: center;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                      <span style="color: #F2B33D;">Studio</span>OS
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 9.5px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.16em; margin-top: 10px;">
                ${e.confirm_signup.tagline}
              </div>
              <h1 style="margin: 18px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.6px; line-height: 1.25;">
                ${e.confirm_signup.title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 36px 40px; text-align: ${textAlign};">
              <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #d4d4d8; text-align: center;">
                ${e.confirm_signup.body}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" class="btn-gold" style="display: inline-block; background: linear-gradient(135deg, #F2B33D 0%, #D89824 100%); color: #08080a !important; font-size: 14.5px; font-weight: 800; text-align: center; padding: 15px 38px; border-radius: 12px; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(242, 179, 61, 0.35); text-decoration: none;">
                      ${e.confirm_signup.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #121217; background-image: linear-gradient(#121217, #121217); border: 1px dashed #282832; border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 28px;">
                <div style="font-size: 10.5px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.12em; font-family: monospace; margin-bottom: 6px;">
                  ${e.confirm_signup.otp_label}
                </div>
                <div style="font-family: monospace; font-size: 24px; font-weight: 800; letter-spacing: 0.35em; color: #F2B33D;">
                  {{ .Token }}
                </div>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #1c1c22; padding-top: 24px; margin-bottom: 12px;">
                <tr>
                  <td style="font-size: 11.5px; color: #a1a1aa; line-height: 1.6; text-align: ${textAlign};">
                    <div style="color: #ffffff; font-weight: 700; margin-bottom: 6px;">${e.confirm_signup.unlocks_title}</div>
                    &bull; ${e.confirm_signup.unlock_1}<br>
                    &bull; ${e.confirm_signup.unlock_2}<br>
                    &bull; ${e.confirm_signup.unlock_3}
                  </td>
                </tr>
              </table>
              <div style="margin-top: 20px; font-size: 11px; color: #71717a; text-align: center; line-height: 1.4;">
                ${e.confirm_signup.disclaimer}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0d; background-image: linear-gradient(#0a0a0d, #0a0a0d); border-top: 1px solid #18181e; padding: 24px 40px; text-align: center; font-size: 10.5px; color: #71717a; font-family: monospace;">
              ${e.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 2. reset-password.html
  const resetPasswordHtml = `<!DOCTYPE html>
<html lang="${lang}"${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Aster Account &bull; StudioOS — ${e.reset_password.subject}</title>
  <style>
    :root { color-scheme: light only; }
    body {
      margin: 0; padding: 0; background-color: #08080a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }
    table { border-collapse: separate; }
    .btn-coral:hover {
      background: linear-gradient(135deg, #f87171 0%, #dc2626 100%) !important;
      box-shadow: 0 0 25px rgba(242, 96, 76, 0.5) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 15px; background-color: #08080a; background-image: linear-gradient(#08080a, #08080a); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #08080a; background-image: linear-gradient(#08080a, #08080a);">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #0e0e12; background-image: linear-gradient(#0e0e12, #0e0e12); border: 1px solid #232328; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #F2604C 0%, #F2B33D 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(242, 96, 76, 0.08); border: 1px solid rgba(242, 96, 76, 0.3); border-radius: 20px; padding: 5px 14px; margin-bottom: 14px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 10px; font-weight: 700; color: #F2604C; letter-spacing: 0.14em; text-transform: uppercase;">
                  ${e.reset_password.badge}
                </span>
              </div>
              <div>
                <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(242, 96, 76, 0.12); border: 1px solid rgba(242, 96, 76, 0.35); border-radius: 14px; line-height: 44px; font-size: 20px; margin-bottom: 12px;">
                  🔑
                </div>
              </div>
              <div style="font-family: monospace; font-size: 10px; color: #F2604C; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700;">
                ${e.reset_password.tagline}
              </div>
              <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.6px;">
                ${e.reset_password.title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 36px 40px;">
              <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #d4d4d8; text-align: center;">
                ${e.reset_password.body}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #121217; background-image: linear-gradient(#121217, #121217); border: 1px solid #24242d; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px; text-align: center;">
                    <div style="font-size: 11px; font-family: monospace; color: #F2B33D; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                      ⏳ ${e.reset_password.expiry_badge}
                    </div>
                    <div style="font-size: 12.5px; color: #d4d4d8; margin-top: 3px;">
                      ${e.reset_password.expiry_text}
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" class="btn-coral" style="display: inline-block; background: linear-gradient(135deg, #F2604C 0%, #DC4C38 100%); color: #ffffff !important; font-size: 14.5px; font-weight: 800; text-align: center; padding: 15px 36px; border-radius: 12px; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(242, 96, 76, 0.4); text-decoration: none;">
                      ${e.reset_password.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #121217; background-image: linear-gradient(#121217, #121217); border: 1px dashed #2d2d38; border-radius: 12px; padding: 14px 20px; text-align: center; margin-bottom: 26px;">
                <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.12em; font-family: monospace; margin-bottom: 5px;">
                  ${e.reset_password.otp_label}
                </div>
                <div style="font-family: monospace; font-size: 22px; font-weight: 800; letter-spacing: 0.3em; color: #F2604C;">
                  {{ .Token }}
                </div>
              </div>
              <div style="background-color: #0d0d10; border-left: 3px solid #71717a; padding: 14px 18px; border-radius: 4px; margin-top: 20px; text-align: ${textAlign};">
                <div style="font-size: 11.5px; font-weight: 700; color: #d4d4d8;">
                  ${e.reset_password.not_requested_title}
                </div>
                <div style="font-size: 11.5px; color: #888892; margin-top: 3px; line-height: 1.5;">
                  ${e.reset_password.not_requested_text}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0d; background-image: linear-gradient(#0a0a0d, #0a0a0d); border-top: 1px solid #18181e; padding: 24px 40px; text-align: center; font-size: 10.5px; color: #71717a; font-family: monospace;">
              ${e.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 3. change-email.html
  const changeEmailHtml = `<!DOCTYPE html>
<html lang="${lang}"${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Aster Account &bull; StudioOS — ${e.change_email.subject}</title>
  <style>
    :root { color-scheme: light only; }
    body {
      margin: 0; padding: 0; background-color: #08080a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }
    table { border-collapse: separate; }
    .btn-shield:hover {
      background-color: #27b889 !important;
      box-shadow: 0 0 25px rgba(47, 212, 160, 0.45) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 15px; background-color: #08080a; background-image: linear-gradient(#08080a, #08080a); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #08080a; background-image: linear-gradient(#08080a, #08080a);">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #0e0e12; background-image: linear-gradient(#0e0e12, #0e0e12); border: 1px solid #232328; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #2FD4A0 0%, #6E93F5 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(47, 212, 160, 0.08); border: 1px solid rgba(47, 212, 160, 0.3); border-radius: 20px; padding: 5px 14px; margin-bottom: 14px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 10px; font-weight: 700; color: #2FD4A0; letter-spacing: 0.14em; text-transform: uppercase;">
                  ${e.change_email.badge}
                </span>
              </div>
              <div>
                <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(47, 212, 160, 0.12); border: 1px solid rgba(47, 212, 160, 0.35); border-radius: 14px; line-height: 44px; font-size: 20px; margin-bottom: 12px;">
                  🛡️
                </div>
              </div>
              <div style="font-family: monospace; font-size: 10px; color: #2FD4A0; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700;">
                ${e.change_email.tagline}
              </div>
              <h1 style="margin: 10px 0 0 0; font-size: 23px; font-weight: 800; color: #ffffff; letter-spacing: -0.6px;">
                ${e.change_email.title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 36px 40px; text-align: ${textAlign};">
              <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #d4d4d8; text-align: center;">
                ${e.change_email.body}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #121216; background-image: linear-gradient(#121216, #121216); border: 1px solid #24242d; border-radius: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="45%" style="vertical-align: top; text-align: ${textAlign};">
                          <div style="font-size: 10.5px; color: #a1a1aa; text-transform: uppercase; font-family: monospace; letter-spacing: 0.1em; font-weight: 600;">
                            ${e.change_email.current_email}
                          </div>
                          <div style="font-size: 13.5px; color: #ffffff; font-weight: 700; margin-top: 4px; word-break: break-all;">
                            {{ .Email }}
                          </div>
                        </td>
                        <td width="10%" align="center" style="vertical-align: middle;">
                          <span style="font-size: 18px; color: #2FD4A0;">&rarr;</span>
                        </td>
                        <td width="45%" style="vertical-align: top; text-align: ${isRtl ? "left" : "right"};">
                          <div style="font-size: 10.5px; color: #2FD4A0; text-transform: uppercase; font-family: monospace; letter-spacing: 0.1em; font-weight: 700;">
                            ${e.change_email.new_email}
                          </div>
                          <div style="font-size: 13.5px; color: #ffffff; font-weight: 700; margin-top: 4px; word-break: break-all;">
                            {{ .NewEmail }}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" class="btn-shield" style="display: inline-block; background-color: #2FD4A0; color: #08080a !important; font-size: 14.5px; font-weight: 800; text-align: center; padding: 15px 36px; border-radius: 12px; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(47, 212, 160, 0.35); text-decoration: none;">
                      ${e.change_email.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #121217; background-image: linear-gradient(#121217, #121217); border: 1px dashed #24242d; border-radius: 12px; padding: 14px 20px; text-align: center; margin-bottom: 26px;">
                <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.12em; font-family: monospace; margin-bottom: 5px;">
                  ${e.change_email.otp_label}
                </div>
                <div style="font-family: monospace; font-size: 22px; font-weight: 800; letter-spacing: 0.3em; color: #2FD4A0;">
                  {{ .Token }}
                </div>
              </div>
              <div style="font-size: 12px; color: #888890; text-align: center; line-height: 1.5; margin-bottom: 12px;">
                ${e.change_email.warning}
              </div>
              <div style="font-size: 11px; color: #666670; text-align: center; line-height: 1.4;">
                ${e.change_email.security_alert}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0d; background-image: linear-gradient(#0a0a0d, #0a0a0d); border-top: 1px solid #18181e; padding: 24px 40px; text-align: center; font-size: 10.5px; color: #71717a; font-family: monospace;">
              ${e.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 4. email-changed-notification.html
  const emailChangedNotificationHtml = `<!DOCTYPE html>
<html lang="${lang}"${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Aster Account &bull; StudioOS — ${e.email_changed_notification.subject}</title>
  <style>
    :root { color-scheme: light only; }
    body {
      margin: 0; padding: 0; background-color: #08080a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }
    table { border-collapse: separate; }
  </style>
</head>
<body style="margin: 0; padding: 40px 15px; background-color: #08080a; background-image: linear-gradient(#08080a, #08080a); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #08080a; background-image: linear-gradient(#08080a, #08080a);">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #0e0e12; background-image: linear-gradient(#0e0e12, #0e0e12); border: 1px solid #232328; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #2FD4A0 0%, #F2B33D 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(47, 212, 160, 0.08); border: 1px solid rgba(47, 212, 160, 0.3); border-radius: 20px; padding: 5px 14px; margin-bottom: 14px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 10px; font-weight: 700; color: #2FD4A0; letter-spacing: 0.14em; text-transform: uppercase;">
                  ${e.email_changed_notification.badge}
                </span>
              </div>
              <div>
                <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(47, 212, 160, 0.12); border: 1px solid rgba(47, 212, 160, 0.35); border-radius: 14px; line-height: 44px; font-size: 20px; margin-bottom: 12px;">
                  ✅
                </div>
              </div>
              <div style="font-family: monospace; font-size: 10px; color: #2FD4A0; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700;">
                ${e.email_changed_notification.tagline}
              </div>
              <h1 style="margin: 10px 0 0 0; font-size: 23px; font-weight: 800; color: #ffffff; letter-spacing: -0.6px;">
                ${e.email_changed_notification.title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 36px 40px; text-align: ${textAlign};">
              <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #d4d4d8; text-align: center;">
                ${e.email_changed_notification.body}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #121216; background-image: linear-gradient(#121216, #121216); border: 1px solid #24242d; border-radius: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="45%" style="vertical-align: top; text-align: ${textAlign};">
                          <div style="font-size: 10.5px; color: #a1a1aa; text-transform: uppercase; font-family: monospace; letter-spacing: 0.1em; font-weight: 600;">
                            ${e.email_changed_notification.old_email}
                          </div>
                          <div style="font-size: 13.5px; color: #a1a1aa; font-weight: 600; margin-top: 4px; word-break: break-all; text-decoration: line-through;">
                            {{ .OldEmail }}
                          </div>
                        </td>
                        <td width="10%" align="center" style="vertical-align: middle;">
                          <span style="font-size: 18px; color: #2FD4A0;">&rarr;</span>
                        </td>
                        <td width="45%" style="vertical-align: top; text-align: ${isRtl ? "left" : "right"};">
                          <div style="font-size: 10.5px; color: #2FD4A0; text-transform: uppercase; font-family: monospace; letter-spacing: 0.1em; font-weight: 700;">
                            ${e.email_changed_notification.active_email}
                          </div>
                          <div style="font-size: 13.5px; color: #ffffff; font-weight: 700; margin-top: 4px; word-break: break-all;">
                            {{ .Email }}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="https://studio.asterdev.me" style="display: inline-block; background-color: #2FD4A0; color: #08080a !important; font-size: 14.5px; font-weight: 800; text-align: center; padding: 14px 34px; border-radius: 12px; letter-spacing: 0.02em; text-decoration: none;">
                      ${e.email_changed_notification.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #160e10; border: 1px solid #3d1b20; border-radius: 12px; padding: 18px 20px; text-align: center;">
                <div style="font-size: 11px; font-family: monospace; color: #F2604C; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 6px;">
                  ⚠️ ${e.email_changed_notification.alert}
                </div>
                <div style="margin-top: 12px;">
                  <a href="mailto:help@asterdev.me?subject=URGENT%20Unauthorized%20Email%20Change" style="display: inline-block; background-color: rgba(242, 96, 76, 0.15); border: 1px solid rgba(242, 96, 76, 0.4); color: #F2604C !important; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                    ${e.email_changed_notification.emergency_cta}
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0d; background-image: linear-gradient(#0a0a0d, #0a0a0d); border-top: 1px solid #18181e; padding: 24px 40px; text-align: center; font-size: 10.5px; color: #71717a; font-family: monospace;">
              ${e.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  fs.writeFileSync(path.join(targetDir, "confirm-signup.html"), confirmSignupHtml, "utf-8");
  fs.writeFileSync(path.join(targetDir, "reset-password.html"), resetPasswordHtml, "utf-8");
  fs.writeFileSync(path.join(targetDir, "change-email.html"), changeEmailHtml, "utf-8");
  fs.writeFileSync(path.join(targetDir, "email-changed-notification.html"), emailChangedNotificationHtml, "utf-8");
}

console.log(`Successfully generated localized email templates for ${locales.length} languages!`);
