const form = document.getElementById('video-form');
const input = document.getElementById('video-url');
const feed = document.getElementById('feed');
const references = document.getElementById('reference-list');
const discussionContent = document.getElementById('discussion-content');
const videoContainer = document.getElementById('video-container');
const videoHelp = document.getElementById('video-help');
const template = document.getElementById('feed-item-template');

let source;
const seenReferences = new Map();

function toTimestamp(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderVideo(videoId, originalUrl) {
  if (!videoId) {
    videoContainer.textContent = 'Could not detect a YouTube ID; running analysis with fallback captions.';
    videoHelp.textContent = 'Tip: use a full YouTube URL containing a valid video ID.';
    return;
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  videoContainer.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0"
      allow="autoplay; encrypted-media"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      title="YouTube player"
    ></iframe>
  `;

  videoHelp.innerHTML = `
    If you see “Video unavailable”, the owner has disabled embedding for this video or region.<br />
    <a href="${watchUrl}" target="_blank" rel="noreferrer">Open video on YouTube</a>
    ${originalUrl && !originalUrl.includes('youtube.com') && !originalUrl.includes('youtu.be') ? ' (original URL analyzed with fallback stream)' : ''}
  `;
}

function renderDefinitions(text, definitions) {
  if (!definitions.length) return text;

  let enhanced = text;
  definitions.forEach(({ term, definition }) => {
    const regex = new RegExp(`\\b(${term})\\b`, 'ig');
    enhanced = enhanced.replace(regex, `<span class="def-term" data-definition="${definition}">$1</span>`);
  });
  return enhanced;
}

function addFeedItem(item) {
  const node = template.content.firstElementChild.cloneNode(true);
  const statusClass = item.classification.label.replace(/\s+/g, '-');

  node.classList.add(statusClass);
  node.querySelector('.timestamp').textContent = `t+${toTimestamp(item.atSeconds)}`;
  node.querySelector('.badge').textContent = `${item.classification.label} (${Math.round(item.classification.confidence * 100)}%)`;
  node.querySelector('.claim').innerHTML = renderDefinitions(item.text, item.definitions);
  node.querySelector('.definitions').textContent = item.definitions.length
    ? 'Hover highlighted terms for definitions.'
    : 'No glossary terms found.';

  node.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    document.querySelector('[data-tab="discussion"]').classList.add('active');
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById('discussion').classList.add('active');

    discussionContent.innerHTML = `
      <h3>Selected claim</h3>
      <p>${item.text}</p>
      <h4>Discussion prompts</h4>
      <ul>${item.discussion.map((prompt) => `<li>${prompt}</li>`).join('')}</ul>
    `;
  });

  feed.prepend(node);

  item.references.forEach((ref) => {
    if (seenReferences.has(ref.url)) return;
    seenReferences.set(ref.url, ref.title);
    const li = document.createElement('li');
    li.innerHTML = `<a href="${ref.url}" target="_blank" rel="noreferrer">${ref.title}</a>`;
    references.prepend(li);
  });
}

function resetUI() {
  feed.innerHTML = '';
  references.innerHTML = '';
  discussionContent.innerHTML = '';
  videoHelp.textContent = '';
  seenReferences.clear();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (source) source.close();

  resetUI();

  const url = input.value.trim();
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl: url })
  });

  if (!response.ok) {
    alert('Failed to start session.');
    return;
  }

  const { sessionId, videoId } = await response.json();
  renderVideo(videoId, url);

  source = new EventSource(`/api/session/${sessionId}/stream`);
  source.onmessage = (msg) => addFeedItem(JSON.parse(msg.data));
  source.addEventListener('end', () => source.close());
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});
