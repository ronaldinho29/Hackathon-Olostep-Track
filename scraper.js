const puppeteer = require('puppeteer');
const chalk = require('chalk');

const url = 'https://www.complex.com/sports/a/adam-caparell/best-nba-players-of-all-time-ranked';

async function scrapeData() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Optional: Set a custom user-agent to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
        const header = document.querySelector('title').innerText.trim(); // Get the page title
        const players = [];
        
        // Extract player names and ranks from <h2> elements
        document.querySelectorAll('h2').forEach((element) => {
            const text = element.innerText.trim();
            if (text && !text.includes('Do Not Sell or Share My Personal Data')) {
                players.push(text);
            }
        });
        
        // Clean and sort the data
        const sortedPlayers = players.map((item) => {
            const match = item.match(/^(\d+)\.\s*(.*)$/);
            return match ? { rank: parseInt(match[1]), name: match[2] } : null;
        }).filter(item => item !== null)
        .sort((a, b) => a.rank - b.rank);

        return { header, sortedPlayers };
    });

    await browser.close();

    // Print header with styling
    console.log(chalk.blue.bold(data.header));
    
    // Print sorted players
    data.sortedPlayers.forEach((item) => {
        console.log(chalk.green(`${item.rank}. ${item.name}`));
    });
}

scrapeData();
