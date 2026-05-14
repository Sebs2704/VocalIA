import smtplib
import asyncio
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import settings


def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Puerto 465 SSL directo (igual que nodemailer service:'gmail')
    # Forzar IPv4 — Railway no tiene rutas IPv6
    ipv4 = socket.getaddrinfo("smtp.gmail.com", 465, socket.AF_INET)[0][4][0]
    with smtplib.SMTP_SSL(ipv4, 465) as server:
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def send_email(to_email: str, subject: str, html_body: str) -> None:
    await asyncio.to_thread(_send_smtp, to_email, subject, html_body)


def reset_password_html(username: str, reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:32px 16px}}
  .wrap{{max-width:480px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.10)}}
  .hdr{{background:linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%);padding:36px 32px;text-align:center}}
  .hdr h1{{color:#fff;font-size:26px;font-weight:800;letter-spacing:-.5px}}
  .hdr p{{color:rgba(255,255,255,.70);font-size:14px;margin-top:6px}}
  .body{{padding:36px 32px}}
  .body p{{color:#374151;line-height:1.7;font-size:15px;margin-bottom:16px}}
  .cta{{text-align:center;margin:28px 0}}
  .btn{{display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff !important;padding:15px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.2px}}
  .note{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;font-size:12px;color:#6b7280;word-break:break-all;margin-top:20px}}
  .ftr{{padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px}}
  .emoji{{font-size:36px;display:block;margin-bottom:12px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <span class="emoji">🎤</span>
    <h1>VocalIA</h1>
    <p>Restablecimiento de contraseña</p>
  </div>
  <div class="body">
    <p>Hola, <strong>{username}</strong> 👋</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>VocalIA</strong>. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
    <div class="cta">
      <a href="{reset_url}" class="btn">Restablecer mi contraseña</a>
    </div>
    <p>⏱️ Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo sin ningún problema.</p>
    <div class="note">
      <strong>Si el botón no funciona, copia este enlace en tu navegador:</strong><br>{reset_url}
    </div>
  </div>
  <div class="ftr">
    VocalIA — Descubre el poder de tu voz &nbsp;🎵<br>
    Este correo fue enviado automáticamente, por favor no respondas.
  </div>
</div>
</body>
</html>"""
