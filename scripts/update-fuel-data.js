const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

function generateTransactionId() {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-AU', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).replace(',', '');
}

async function getAccessToken() {
    const basicAuth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

    const response = await fetch(
        'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
        {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Accept': 'application/json'
            }
        }
    );

    const text = await response.text();

    if (!response.ok || !text) {
        throw new Error(`Token request failed`);
    }

    const data = JSON.parse(text);
    return data.access_token;
}

async function fetchAllFuelPrices(token) {
    const transactionId = generateTransactionId();
    const timestamp = getCurrentTimestamp();

    const response = await fetch(
        'https://api.onegov.nsw.gov.au/FuelPriceCheck/v1/fuel/prices',
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=utf-8',
                'apikey': API_KEY,
                'transactionid': transactionId,
                'requesttimestamp': timestamp
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
    }

    return await response.json();
}

async function main() {
    try {
        if (!API_KEY || !API_SECRET) {
            throw new Error('Missing API credentials');
        }

        const token = await getAccessToken();
        const data = await fetchAllFuelPrices(token);

        // === FIX: Always set a fresh timestamp ===
        const now = new Date().toISOString();

        const outputData = {
            lastUpdated: now,                    // Always use current time
            stations: data.stations || [],
            prices: data.prices || []
        };

        const outputPath = path.join(__dirname, '../data/fuel-prices.json');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

        console.log(`✅ Successfully saved ${outputData.prices.length} prices`);
        console.log(`🕒 lastUpdated set to: ${now}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
