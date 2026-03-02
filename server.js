const http = require('http');
const fs = require('fs');
const path = require('path');
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

function fallbackTranscript() {
  return [
    { text: 'The unemployment rate has dropped to its lowest level in years.', offset: 0 },
    { text: 'Experts say inflation remains a concern for household budgets.', offset: 4 },
    { text: 'The speaker claims this policy has already reduced emissions by 40 percent.', offset: 8 },
    { text: 'Opposition leaders argue the same policy increased taxes for workers.', offset: 12 },
    { text: 'Analysts are debating whether this trend will continue into next year.', offset: 16 }
  ];
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

    req.on('end', () => {
      try {
        const { videoUrl } = JSON.parse(body || '{}');
        if (!videoUrl) return sendJson(res, 400, { error: 'videoUrl is required' });

        const videoId = parseYouTubeId(videoUrl);
        const sessionId = randomUUID();

        sessions.set(sessionId, {
          videoId,
          transcript: fallbackTranscript(),
          cursor: 0
        });

        sendJson(res, 200, { sessionId, videoId, transcriptLength: 5 });
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
