import express from 'express';
import cors from 'cors';
import https from 'https';
import puppeteer from 'puppeteer';
import bodyParser from 'body-parser';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/sg-auction', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const url = `https://www.sogocorporation.com/parade-auction-list?page=${page}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.sogocorporation.com/',
        'Connection': 'keep-alive',
      }
    });
    if (!response.ok) {
      console.error('Remote error:', response.status, response.statusText);
      res.status(response.status).send('Remote error: ' + response.statusText);
      return;
    }
    const html = await response.text();
    res.send(html);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).send('Error: ' + e.toString());
  }
});

app.get('/sg-img', async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl || !imgUrl.startsWith('https://sogocorporation.com/')) {
      res.status(400).send('Invalid image url');
      return;
    }
    https.get(imgUrl, (imgRes) => {
      if (imgRes.statusCode !== 200) {
        res.status(imgRes.statusCode).send('Image fetch error');
        return;
      }
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
      imgRes.pipe(res);
    }).on('error', (e) => {
      res.status(500).send('Proxy image error: ' + e.toString());
    });
  } catch (e) {
    res.status(500).send('Proxy image error: ' + e.toString());
  }
});

app.get('/sg-detail', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://www.sogocorporation.com/parade-auction-detail/')) {
    res.status(400).send('Invalid detail url');
    return;
  }
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Дочекайтесь, поки зʼявиться таблиця з деталями (або інший ключовий елемент)
    await page.waitForSelector('table', { timeout: 15000 });
    const html = await page.content();
    await browser.close();
    res.send(html);
  } catch (e) {
    res.status(500).send('Puppeteer error: ' + e.toString());
  }
});

app.get('/jen-auction', async (req, res) => {
  try {
    // Параметри сторінки (offset, page тощо) можна прокидати через query
    const offset = req.query.offset || 1;
    const page = req.query.page || 1;
    const url = `https://www.jencorp.net/en/net/?id=&MODEL_ITEM_LIMIT=30&MODEL_ITEM_PAGE=${page}&MODEL_ITEM_SORT=7&MODEL_ITEM_S_AUCNUM=&MODEL_ITEM_S_DELIYARD=&MODEL_ITEM_S_MODEL=&MODEL_ITEM_S_AUCEND_Y=&MODEL_ITEM_S_AUCEND_M=&MODEL_ITEM_S_AUCEND_D=&MODEL_ITEM_S_ICONTYPE=&MODEL_ITEM_S_THUMBNAIL=&MODEL_ITEM_OFFSET=${offset}&MODEL_ITEM_S_FAVORITE=&MODEL_ITEM_S_BIDDING=`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.jencorp.net/',
        'Connection': 'keep-alive',
      }
    });
    if (!response.ok) {
      res.status(response.status).send('Remote error: ' + response.statusText);
      return;
    }
    const html = await response.text();
    res.send(html);
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.toString());
  }
});

app.get('/jen-img', async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (
      !imgUrl ||
      !(imgUrl.startsWith('https://www.jencorp.net/') || imgUrl.startsWith('https://jencorp.net/'))
    ) {
      res.status(400).send('Invalid image url');
      return;
    }
    https.get(imgUrl, (imgRes) => {
      if (imgRes.statusCode !== 200) {
        res.status(imgRes.statusCode).send('Image fetch error');
        return;
      }
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
      imgRes.pipe(res);
    }).on('error', (e) => {
      res.status(500).send('Proxy image error: ' + e.toString());
    });
  } catch (e) {
    res.status(500).send('Proxy image error: ' + e.toString());
  }
});

app.get('/jen-detail', async (req, res) => {
  const url = req.query.url;
  if (
    !url ||
    !(url.startsWith('https://www.jencorp.net/en/net/model/detail.html') ||
      url.startsWith('https://jencorp.net/en/net/model/detail.html'))
  ) {
    res.status(400).send('Invalid detail url');
    return;
  }
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // Спробуйте дочекатися одного з можливих контейнерів з фото або просто body
    try {
      await page.waitForSelector('.thumb_list img, .main_img img, .photo_area img, table, body', { timeout: 20000 });
    } catch (e) {
      // Якщо не знайдено, все одно пробуємо взяти контент
      console.error('jen-detail: selector not found, fallback to body');
    }

    const html = await page.content();
    await browser.close();
    res.send(html);
  } catch (e) {
    console.error('jen-detail error:', e);
    res.status(500).send('Puppeteer error: ' + e.toString());
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy running on ${PORT}`);
});

export default app;