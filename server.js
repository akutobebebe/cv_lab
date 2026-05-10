const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const { Resend } = require('resend');
const path = require('path');
require('dotenv').config();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function startServer() {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: 'localhost'
  });

  await server.register(Inert);

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const mailTo = process.env.MAIL_TO;

  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  server.route({
    method: 'POST',
    path: '/api/contact',
    handler: async (request, h) => {
      const { name, email, subject, message } = request.payload || {};

      if (!name || !email || !subject || !message) {
        return h.response({
          message: 'Усі поля (name, email, subject, message) є обов’язковими.'
        }).code(400);
      }

      if (!isValidEmail(email)) {
        return h.response({
          message: 'Некоректний формат email.'
        }).code(400);
      }

      if (!resendApiKey || !mailTo) {
        return h.response({
          message: 'Сервер не налаштований для відправки email. Перевірте .env.'
        }).code(500);
      }

      try {
        console.log('Sending email to:', mailTo);
        console.log('From:', resendFrom);
        console.log('API Key available:', !!resendApiKey);

        const result = await resend.emails.send({
          from: `CV Contact <${resendFrom}>`,
          to: mailTo,
          replyTo: email,
          subject: `[CV Contact] ${subject}`,
          text: `Ім'я: ${name}\nEmail: ${email}\n\nПовідомлення:\n${message}`
        });

        console.log('Email sent result:', result);

        return h.response({
          message: 'Повідомлення успішно відправлено.'
        }).code(200);
      } catch (error) {
        console.error('Email send error:', error);
        return h.response({
          message: `Не вдалося відправити email: ${error.message}`
        }).code(500);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: path.join(__dirname, 'public'),
        index: ['index.html']
      }
    }
  });

  await server.start();
  console.log(`Server is running at ${server.info.uri}`);
}

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

startServer();
