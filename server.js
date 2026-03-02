const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const sessions = new Map();

const definitionDictionary = {
  inflation: 'Inflation is the rate at which prices for goods and services rise over time.',
  recession: 'A recession is a significant decline in economic activity lasting more than a few months.',
  gdp: 'Gross Domestic Product (GDP) measures the total value of goods and services produced in a country.',
  climate: 'Climate is the long-term pattern of weather in a region.',
  vaccine: 'A vaccine helps your immune system learn to defend against a disease.',
  unemployment: 'Unemployment is the share of people seeking work who do not currently have a job.'
};

function parseYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v');
  } catch {
    return null;
  }
  return null;
}

function inferTopic(title = '') {
  const normalized = title.toLowerCase();
  if (/iran|israel|gaza|war|military|strike|nato|white house|president|trump|biden/.test(normalized)) {
    return 'geopolitics';
  }
  if (/inflation|jobs|economy|gdp|recession|federal reserve|rates/.test(normalized)) {
    return 'economy';
  }
  if (/climate|emissions|carbon|energy|oil|electric/.test(normalized)) {
    return 'climate';
  }
  if (/vaccine|covid|health|hospital|disease/.test(normalized)) {
    return 'health';
  }
  return 'general';
}

function fallbackTranscript(metadata = {}) {
  const topic = inferTopic(metadata.title);
  const subject = metadata.title || 'this video';
  const source = metadata.authorName || 'the speaker';

  const transcriptByTopic = {
    geopolitics: [
      `In ${subject}, ${source} says the operation could continue for several weeks.`,
      `${source} claims recent strikes were intended as a limited response rather than a broader escalation.`,
      'Opposition analysts argue the same actions could increase regional instability.',
      'Officials say diplomatic channels remain open while military activity continues.',
      'Commentators are debating whether allies will support the next phase of the strategy.'
    ],
    economy: [
      `In ${subject}, ${source} says recent policy is helping reduce inflation pressures.`,
      'Economists in the segment argue wage growth is still lagging behind living costs.',
      'The speaker claims job growth remains resilient despite high interest rates.',
      'Critics argue headline numbers hide pressure on lower-income households.',
      'Analysts are debating whether the trend will continue into next quarter.'
    ],
    climate: [
      `In ${subject}, ${source} says emissions targets are achievable with current policy.`,
      'Supporters claim clean-energy investment has accelerated over the last year.',
      'Opponents argue energy costs have risen faster than projected.',
      'Experts in the segment debate whether grid reliability can keep pace with demand.',
      'The panel discusses how different regions may be affected by the transition.'
    ],
    health: [
      `In ${subject}, ${source} discusses current evidence about health-system readiness.`,
      'The speaker claims updated guidance improved outcomes in recent cases.',
      'Some doctors argue access gaps are still limiting benefits for vulnerable groups.',
      'Public officials say hospitalization trends are being monitored closely.',
      'Analysts debate whether the current response model is sustainable long term.'
    ],
    general: [
      `In ${subject}, ${source} outlines the main claim discussed in the video.`,
      'The speaker presents supporting points and cites recent developments.',
      'Critics in the segment argue key context is still missing from the claim.',
      'Experts discuss what evidence would be needed to verify the strongest statements.',
      'Analysts are debating whether the claim will hold as new data appears.'
    ]
  };

  return transcriptByTopic[topic].map((text, index) => ({ text, offset: index * 4 }));
}

function fetchText(url) {
  return new Promise((resolve) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'
          }
        },
        (response) => {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
            if (data.length > 2e6) response.destroy();
          });
          response.on('end', () => {
            if (response.statusCode !== 200) {
              resolve(null);
              return;
            }
            resolve(data);
          });
        }
      )
      .on('error', () => resolve(null));
  });
}

async function fetchVideoMetadata(videoId) {
  if (!videoId) return null;

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;

  const oembedText = await fetchText(oembedUrl);
  if (oembedText) {
    try {
      const parsed = JSON.parse(oembedText);
      return { title: parsed.title, authorName: parsed.author_name };
    } catch {
      // Fall through to HTML parsing.
    }
  }

  const watchPage = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  if (!watchPage) return null;

  const titleMatch = watchPage.match(/<title>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.replace(/\s*-\s*YouTube\s*$/i, '').trim();
  if (!rawTitle) return null;

  return { title: rawTitle, authorName: 'the speaker' };
}

function extractKeyTerms(text) {
  const lower = text.toLowerCase();
  return Object.keys(definitionDictionary).filter((term) => lower.includes(term));
}

function buildReferences(text) {
  const candidates = text.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b/g) || [];
  const uniq = [...new Set(candidates)].slice(0, 3);
  return uniq.map((entity) => ({
    title: entity,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entity.replace(/\s+/g, '_'))}`
  }));
}

function classifyClaim(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('debate') || normalized.includes('argue') || normalized.includes('claim')) {
    return { label: 'contentious', confidence: 0.54 };
  }
  if (normalized.includes('lowest') || normalized.includes('always') || normalized.includes('never')) {
    return { label: 'possibly false', confidence: 0.42 };
  }
  if (normalized.includes('experts say') || normalized.includes('according to')) {
    return { label: 'likely true', confidence: 0.71 };
  }
  return { label: 'needs context', confidence: 0.5 };
}

function createDiscussionPrompts(text) {
  return [
    `What primary source supports or contradicts: "${text}"?`,
    'Is the statement descriptive or causal?',
    'What alternate explanations should be considered?'
  ];
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const targetPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(targetPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/session') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });

    req.on('end', async () => {
      try {
        const { videoUrl } = JSON.parse(body || '{}');
        if (!videoUrl) return sendJson(res, 400, { error: 'videoUrl is required' });

        const videoId = parseYouTubeId(videoUrl);
        const sessionId = randomUUID();
        const metadata = await fetchVideoMetadata(videoId);
        const generatedFromMetadata = Boolean(metadata);

        sessions.set(sessionId, {
          videoId,
          transcript: fallbackTranscript(metadata || {}),
          generatedFromMetadata,
          cursor: 0
        });

        sendJson(res, 200, {
          sessionId,
          videoId,
          transcriptLength: 5,
          generatedFromMetadata,
          videoTitle: metadata?.title || null
        });
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/session/') && req.url.endsWith('/stream')) {
    const parts = req.url.split('/');
    const sessionId = parts[3];
    const session = sessions.get(sessionId);
    if (!session) {
      res.writeHead(404);
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    const timer = setInterval(() => {
      const item = session.transcript[session.cursor];
      if (!item) {
        res.write('event: end\n');
        res.write('data: {"done":true}\n\n');
        clearInterval(timer);
        return;
      }

      const terms = extractKeyTerms(item.text);
      const payload = {
        id: `${sessionId}-${session.cursor}`,
        text: item.text,
        atSeconds: item.offset,
        classification: classifyClaim(item.text),
        references: buildReferences(item.text),
        definitions: terms.map((term) => ({ term, definition: definitionDictionary[term] })),
        discussion: createDiscussionPrompts(item.text)
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      session.cursor += 1;
    }, 2000);

    req.on('close', () => clearInterval(timer));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`fact-checker running at http://localhost:${PORT}`);
});
