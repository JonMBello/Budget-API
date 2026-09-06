const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Helper to load .env manually if dotenv isn't directly exposed
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo .env no encontrado en la raíz del proyecto.');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

loadEnv();

async function main() {
  const provider = process.env.BUDGET_API_EMAIL_PROVIDER || 'smtp';
  const resendApiKey = process.env.BUDGET_API_RESEND_API_KEY;
  const host = process.env.BUDGET_API_SMTP_HOST;
  const port = parseInt(process.env.BUDGET_API_SMTP_PORT || '587', 10);
  const user = process.env.BUDGET_API_SMTP_USER;
  const pass = process.env.BUDGET_API_SMTP_PASS;
  const from = process.env.BUDGET_API_SMTP_FROM || 'Budget App <budget@jonmb.com>';

  const targetRecipient = process.argv[2] || user;

  console.log('----------------------------------------------------');
  console.log('🔍 Probando configuración de correo...');
  console.log(`- Proveedor: ${provider}`);
  console.log(`- Host: ${provider === 'resend' ? 'smtp.resend.com' : host}`);
  console.log(`- Puerto: ${provider === 'resend' ? 465 : port}`);
  console.log(`- Usuario: ${provider === 'resend' ? 'resend' : user}`);
  console.log(`- Remitente (From): ${from}`);
  console.log(`- Destinatario de prueba: ${targetRecipient || '(No definido)'}`);
  console.log('----------------------------------------------------');

  let transporter;

  if (provider === 'resend' && resendApiKey) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: resendApiKey },
    });
  } else if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    console.error('❌ Faltan credenciales en tu .env para configurar SMTP o Resend.');
    process.exit(1);
  }

  try {
    console.log('⏳ 1. Verificando conexión y credenciales con el servidor...');
    await transporter.verify();
    console.log('✅ ¡Conexión SMTP exitosa! Credenciales y servidor validados.');

    if (targetRecipient) {
      console.log(`⏳ 2. Enviando correo de prueba a: ${targetRecipient}...`);
      const providerLabel = provider === 'resend' ? 'Resend' : `SMTP (${host || 'Personal'})`;
      const info = await transporter.sendMail({
        from,
        to: targetRecipient,
        subject: '🎉 Prueba de configuración Budget-API',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0;">¡Conexión Exitosa!</h2>
            <p>Este correo confirma que tu configuración de <strong>${providerLabel}</strong> en Budget-API está funcionando perfectamente.</p>
            <p style="color: #718096; font-size: 13px;">Enviado el: ${new Date().toLocaleString()}</p>
          </div>
        `,
      });

      console.log('🎉 ¡Correo enviado con éxito!');
      console.log(`- Message ID: ${info.messageId}`);
    } else {
      console.log('ℹ️ Para enviar un correo de prueba real, pasa un correo como argumento:');
      console.log('   node scripts/test-email.js tu-correo@destino.com');
    }
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Error al conectar o enviar correo:', error.message);
    if (error.code) console.error(`Código de error: ${error.code}`);
    console.log('----------------------------------------------------');
  }
}

main();
