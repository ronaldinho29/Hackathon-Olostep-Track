const puppeteer = require('puppeteer');
const chalk = require('chalk');
const { MongoClient } = require('mongodb');

const url = 'https://www.complex.com/sports/a/adam-caparell/best-nba-players-of-all-time-ranked';
const mongoUrl = 'mongodb+srv://ronaldchomnou:Ronaldinho2910@cluster0.39ac5k2.mongodb.net/OlostepTrack?retryWrites=true&w=majority&appName=Cluster0';

async function scrapeData() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
        const header = document.querySelector('title').innerText.trim(); // Get the page title
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

        return { header, sortedPlayers };
    });

    await browser.close();

    console.log(chalk.blue.bold(data.header));
    
    data.sortedPlayers.forEach((item) => {
        console.log(chalk.green(`${item.rank}. ${item.name}`));
    });

    return data.sortedPlayers;
}

async function saveToMongoDB(players) {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const database = client.db('OlostepTrack'); // Updated to use the correct database name
        const collection = database.collection('BestPlayers'); // Updated to use the correct collection name
        
        // Insert players into the database
        await collection.insertMany(players);
        console.log(chalk.yellow('Player data has been successfully saved to MongoDB!'));
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
