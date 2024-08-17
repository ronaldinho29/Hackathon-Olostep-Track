const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');

const url = 'https://www.complex.com/sports/a/adam-caparell/best-nba-players-of-all-time-ranked';
const mongoUrl = 'mongodb+srv://ronaldchomnou:Ronaldinho2910@cluster0.39ac5k2.mongodb.net/OlostepTrack?retryWrites=true&w=majority&appName=Cluster0';

async function scrapeData() {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Path to Chrome
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    try {
        const response = await page.goto(url, { waitUntil: 'networkidle2' });
        
        if (response.status() === 404) {
            console.error('Error: Page not found (404)');
            return null;
        }
        
        const data = await page.evaluate(() => {
            const players = [];
            
            document.querySelectorAll('h2').forEach((element) => {
                const text = element.innerText.trim();
                if (text && !text.includes('Do Not Sell or Share My Personal Data')) {
                    players.push(text);
                }
            });
            
            const sortedPlayers = players.map((item) => {
                const match = item.match(/^(\d+)\.\s*(.*)$/);
                return match ? { rank: parseInt(match[1]), name: match[2] } : null;
            }).filter(item => item !== null)
            .sort((a, b) => a.rank - b.rank);

            return sortedPlayers;
        });

        return data;

    } catch (error) {
        console.error('Error during scraping:', error);
        return null;

    } finally {
        await browser.close();
    }
}

async function saveToMongoDB(players) {
    const client = new MongoClient(mongoUrl);

    if (!players) {
        console.log('No data to save.');
        return;
    }

    try {
        await client.connect();
        const database = client.db('OlostepTrack');
        const collection = database.collection('BestPlayers');
        
        await collection.insertMany(players);
        console.log('Player data has been successfully saved to MongoDB!');

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);

    } finally {
        await client.close();
    }
}

async function main() {
    const players = await scrapeData();
    await saveToMongoDB(players);
}

main();
