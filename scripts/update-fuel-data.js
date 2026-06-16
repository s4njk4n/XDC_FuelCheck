const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

async function getAccessToken() {
    const basicAuth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    
    const response = await fetch('https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const data = await response.json();
    return data.access_token;
}

async function fetchFuelPrices(token) {
    const response = await fetch('https://api.onegov.nsw.gov.au/FuelPriceCheck/v1/fuel/prices', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
}

async function main() {
    try {
        console.log('Getting access token...');
        const token = await getAccessToken();

        console.log('Fetching fuel prices...');
        const data = await fetchFuelPrices(token);

        const prices = data.prices || data;

        // Save to data folder
        const outputPath = path.join(__dirname, '../data/fuel-prices.json');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(prices, null, 2));

        console.log(`Saved ${prices.length} stations to data/fuel-prices.json`);
    } catch (error) {
        console.error('Error updating fuel data:', error);
        process.exit(1);
    }
}

main();
