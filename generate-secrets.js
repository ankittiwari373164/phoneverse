const crypto = require('crypto');

// Generate a secure random JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 Your JWT Secret (copy to .env):');
console.log('═══════════════════════════════════════════════════════════════');
console.log(jwtSecret);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Add to .env file:');
console.log(`JWT_SECRET=${jwtSecret}\n`);