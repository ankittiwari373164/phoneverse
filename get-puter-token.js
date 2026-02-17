const puter = require('@heyputer/puter-js-common');

async function getToken() {
    try {
        // This will open browser for login
        await puter.auth.signIn();
        
        // Get token
        const token = await puter.auth.getToken();
        
        console.log('\n🎉 Your Puter API Token:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(token);
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('Add to .env file:');
        console.log(`PUTER_API_TOKEN=${token}\n`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getToken();