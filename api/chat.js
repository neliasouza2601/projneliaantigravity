const https = require('https');
const url = require('url');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  const { messages, temperature, top_p } = req.body || {};

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const model = process.env.AZURE_OPENAI_MODEL;

  if (!apiKey || !endpoint || !model) {
    return res.status(500).json({
      error: {
        message: 'Server configuration error. API key, endpoint, or model environment variable is missing.'
      }
    });
  }

  try {
    const apiUrl = `${endpoint}/chat/completions`;
    const parsedUrl = url.parse(apiUrl);

    const postData = JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature !== undefined ? temperature : 0.7,
      top_p: top_p !== undefined ? top_p : 0.95
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const request = new Promise((resolve, reject) => {
      const apiReq = https.request(options, (apiRes) => {
        let responseBody = '';
        apiRes.on('data', (chunk) => {
          responseBody += chunk;
        });
        apiRes.on('end', () => {
          resolve({
            statusCode: apiRes.statusCode,
            headers: apiRes.headers,
            body: responseBody
          });
        });
      });

      apiReq.on('error', (e) => {
        reject(e);
      });

      apiReq.write(postData);
      apiReq.end();
    });

    const result = await request;

    res.status(result.statusCode);
    res.setHeader('Content-Type', 'application/json');
    res.send(result.body);

  } catch (error) {
    console.error('API function error:', error);
    res.status(500).json({
      error: {
        message: `Internal Server Error: ${error.message}`
      }
    });
  }
};
