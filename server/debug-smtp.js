import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 SMTP Configuration Debug\n');
console.log('Environment variables:');
console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE || 'NOT SET'}`);
console.log(`  SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '*'.repeat(Math.min(process.env.SMTP_PASS.length, 16)) : 'NOT SET'}`);
console.log(`  MAIL_FROM: ${process.env.MAIL_FROM || 'NOT SET'}`);

// Check for common issues
console.log('\n🔍 Checking for issues:\n');

if (!process.env.SMTP_HOST) {
  console.log('❌ SMTP_HOST is not set');
} else if (process.env.SMTP_HOST.includes('your-')) {
  console.log('❌ SMTP_HOST contains placeholder value');
} else {
  console.log('✅ SMTP_HOST is set');
}

if (!process.env.SMTP_PORT) {
  console.log('❌ SMTP_PORT is not set');
} else {
  const port = Number(process.env.SMTP_PORT);
  if (isNaN(port)) {
    console.log('❌ SMTP_PORT is not a valid number');
  } else if (port !== 587 && port !== 465 && port !== 25) {
    console.log(`⚠️  SMTP_PORT is ${port} (unusual value, should be 587 for Gmail)`);
  } else {
    console.log('✅ SMTP_PORT is set');
  }
}

if (!process.env.SMTP_USER) {
  console.log('❌ SMTP_USER is not set');
} else if (process.env.SMTP_USER.includes('your-') || process.env.SMTP_USER.includes('@example')) {
  console.log('❌ SMTP_USER contains placeholder value');
} else if (!process.env.SMTP_USER.includes('@')) {
  console.log('❌ SMTP_USER does not look like an email address');
} else {
  console.log('✅ SMTP_USER is set');
}

if (!process.env.SMTP_PASS) {
  console.log('❌ SMTP_PASS is not set');
} else if (process.env.SMTP_PASS.includes('your-')) {
  console.log('❌ SMTP_PASS contains placeholder value');
} else if (process.env.SMTP_PASS.length < 10) {
  console.log('⚠️  SMTP_PASS seems too short (should be 16 characters for Gmail App Password)');
} else {
  console.log('✅ SMTP_PASS is set');
}

if (process.env.SMTP_PASS && process.env.SMTP_PASS.includes(' ')) {
  console.log('⚠️  SMTP_PASS contains spaces - remove them!');
}

if (process.env.SMTP_SECURE === undefined) {
  console.log('⚠️  SMTP_SECURE is not set (defaulting to false)');
} else if (process.env.SMTP_SECURE !== 'true' && process.env.SMTP_SECURE !== 'false') {
  console.log(`⚠️  SMTP_SECURE has unusual value: ${process.env.SMTP_SECURE} (should be 'true' or 'false')`);
} else {
  console.log('✅ SMTP_SECURE is set');
}

console.log('\n💡 Next steps:');
console.log('   1. Fix any issues shown above');
console.log('   2. Run: node test-smtp.js');
console.log('   3. Restart your server\n');

