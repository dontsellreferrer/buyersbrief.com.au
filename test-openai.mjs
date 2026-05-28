import https from 'https';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY not set');
  process.exit(1);
}

const data = JSON.stringify({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Say "OpenAI API key is valid"' }
  ],
  max_tokens: 10
});

const options = {
  hostname: 'api.openai.com',
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✓ OpenAI API key is valid');
      process.exit(0);
    } else {
      console.error(`✗ OpenAI API returned status ${res.statusCode}`);
      console.error(body);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('✗ Network error:', err.message);
  process.exit(1);
});

req.write(data);
req.end();
