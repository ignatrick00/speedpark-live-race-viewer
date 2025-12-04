const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('🧪 Testing SMTP connection...\n');

  const transporter = nodemailer.createTransport({
    host: 'smtppro.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: 'admin@karteando.cl',
      pass: 'KartingMV1!',
    },
    tls: {
      rejectUnauthorized: true,
    },
    debug: true, // Enable debug output
    logger: true, // Log to console
  });

  try {
    console.log('1️⃣ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    console.log('2️⃣ Sending test email...');
    const info = await transporter.sendMail({
      from: '"Karteando.cl" <admin@karteando.cl>',
      to: 'ircabrera@uc.cl', // Change to your email
      subject: '🏁 Test Email from Karteando.cl',
      text: 'This is a test email to verify SMTP is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP is working.</p>',
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Response:', info.response);

  } catch (error) {
    console.error('\n❌ SMTP Test Failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    console.error('\nFull error:', error);
  }
}

testSMTP();
