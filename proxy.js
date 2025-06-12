import express from 'express';
import cors from 'cors';
import https from 'https';

const app = express();
app.use(cors());

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

const PORT = 3001;
app.listen(PORT, () => console.log('Proxy running on port', PORT));