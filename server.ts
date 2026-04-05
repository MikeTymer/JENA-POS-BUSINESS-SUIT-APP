import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

    // Helper to fix common URL mistakes
    const getCorrectMomoUrl = (baseUrl: string, path: string): string => {
      let cleanBaseUrl = baseUrl.trim();
      if (cleanBaseUrl.endsWith('/')) {
        cleanBaseUrl = cleanBaseUrl.slice(0, -1);
      }
  
      // Prevent double /collection pathing
      if (cleanBaseUrl.toLowerCase().includes('/collection')) {
        // If path starts with /collection, strip it from the path to avoid duplication
        const strippedPath = path.startsWith('/collection') ? path.replace('/collection', '') : path;
        return `${cleanBaseUrl}${strippedPath}`;
      }
  
      return `${cleanBaseUrl}${path}`;
    };

  // MTN MoMo Proxy Endpoints
  // This avoids CORS issues by making the request from the server
  app.post('/api/momo/token', async (req, res) => {
    try {
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const userId = process.env.MTN_MOMO_USER_ID || '';
      const apiKey = process.env.MTN_MOMO_API_KEY || '';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';

      const url = getCorrectMomoUrl(baseUrl, '/collection/token/');
      
      console.log(`MTN MoMo Proxy: Fetching token from ${url}`);
      
      const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Some gateways require a body for POST
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`MTN MoMo Proxy Error (${response.status}) for ${url}:`, errorText);
        return res.status(response.status).json({ 
          error: `MTN API returned ${response.status}`,
          details: errorText.substring(0, 500),
          url: url // Help user see what was called
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('MTN MoMo Proxy Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/momo/requesttopay', async (req, res) => {
    try {
      const { body } = req.body;
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      const targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'production';

      // AUTO-CORRECTION: Sandbox environment ONLY supports EUR. 
      // Production (e.g. 'mtnuganda') supports UGX.
      if (body) {
        body.currency = targetEnvironment === 'sandbox' ? 'EUR' : (process.env.MTN_MOMO_CURRENCY || 'UGX');
      }

      const tokenResponse = await fetch(`http://localhost:3000/api/momo/token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get token for requestToPay');
      const { access_token: token } = await tokenResponse.json();

      const referenceId = uuidv4();
      const url = getCorrectMomoUrl(baseUrl, '/collection/v1_0/requesttopay');
      
      console.log(`MTN MoMo Proxy: Requesting to pay at ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': targetEnvironment,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`MTN MoMo Proxy Error (${response.status}) for ${url}:`, errorText);
        return res.status(response.status).json({ 
          error: `MTN API returned ${response.status}`,
          details: errorText.substring(0, 500),
          url: url
        });
      }

      res.status(202).json({ referenceId });
    } catch (error: any) {
      console.error('MTN MoMo Proxy Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/momo/status/:referenceId', async (req, res) => {
    try {
      const { referenceId } = req.params;
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      const targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'production';

      const tokenResponse = await fetch(`http://localhost:3000/api/momo/token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get token for status check');
      const { access_token: token } = await tokenResponse.json();

      const url = getCorrectMomoUrl(baseUrl, `/collection/v1_0/requesttopay/${referenceId}`);
      
      console.log(`MTN MoMo Proxy: Checking status at ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': targetEnvironment,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`MTN MoMo Proxy Error (${response.status}) for ${url}:`, errorText);
        return res.status(response.status).json({ 
          error: `MTN API returned ${response.status}`,
          details: errorText.substring(0, 500),
          url: url
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('MTN MoMo Proxy Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
