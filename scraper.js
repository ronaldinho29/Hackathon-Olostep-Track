const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const process = require('process');

const mongoUrl = 'mongodb+srv://ronaldchomnou:Ronaldinho2910@cluster0.39ac5k2.mongodb.net/OlostepTrack?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'OlostepTrack';
const collectionName = 'BestPlayers';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Function to scrape data from the provided URL
async function scrapeData(url, selector, dataFormat) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    try {
        const response = await page.goto(url, { waitUntil: 'networkidle2' });
        
        if (response.status() === 404) {
            throw new Error('Page not found (404)');
        }
        
        const data = await page.evaluate((selector, dataFormat) => {
            const items = [];
            
            document.querySelectorAll(selector).forEach((element) => {
                const text = element.innerText.trim();
                if (text) {
                    items.push(text);
                }
            });

            // Convert the dataFormat to a RegExp object
            const regex = new RegExp(dataFormat, 'i');

            const parsedData = items.map((item) => {
                const match = item.match(regex);
                return match ? { text: match[0] } : null;
            }).filter(item => item !== null);

            return parsedData;

        }, selector, dataFormat);

        return data;

    } catch (error) {
        console.error('Error during scraping:', error);
        return null;

    } finally {
        await browser.close();
    }
}

// Function to connect to MongoDB
async function connectToMongo() {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    return client;
}

// Function to delete all documents from the collection
async function deleteAllDocuments() {
    const client = await connectToMongo();
    try {
        const database = client.db(dbName);
        const collection = database.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents.`);
    } catch (error) {
        console.error('Error deleting documents:', error);
    } finally {
        await client.close();
    }
}

// Command-line argument handling
const command = process.argv[2];

if (command === 'deleteAll') {
    deleteAllDocuments().then(() => {
        process.exit();
    }).catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
}

// Express endpoints
app.post('/scrape', async (req, res) => {
    const { url, selector, dataFormat } = req.body;
    
    if (!url || !selector || !dataFormat) {
        return res.status(400).json({ error: 'URL, selector, and dataFormat are required' });
    }

    try {
        const data = await scrapeData(url, selector, dataFormat);

        if (!data) {
            return res.status(500).json({ error: 'Failed to scrape data' });
        }

        // Save to MongoDB
        const client = await connectToMongo();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);
        await collection.insertMany(data);
        await client.close();

        res.json({ message: 'Data scraped and saved successfully!', data });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to delete all data from the collection
app.delete('/deleteAll', async (req, res) => {
    try {
        await deleteAllDocuments();
        res.json({ message: 'All documents deleted successfully.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the static frontend files
app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
