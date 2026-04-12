import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config for API Key
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseApiKey = '';
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    firebaseApiKey = config.apiKey;
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Vite needs this disabled or configured for dev
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json());

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiter to all API routes
  app.use('/api/', limiter);

  // Authentication Middleware
  const verifyFirebaseToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      if (!firebaseApiKey) {
        console.error('Firebase API Key missing for token verification');
        return res.status(500).json({ error: 'Internal server error: Auth configuration missing' });
      }

      // Verify token using Firebase Auth REST API (no service account needed)
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('Firebase Token Verification Failed:', errData);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      const data = await response.json();
      req.user = data.users[0];
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  };

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
  // Protected by verifyFirebaseToken
  app.post('/api/momo/token', verifyFirebaseToken, async (req, res) => {
    try {
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const userId = process.env.MTN_MOMO_USER_ID || '';
      const apiKey = process.env.MTN_MOMO_API_KEY || '';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      let targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
      if (targetEnvironment === 'production') targetEnvironment = 'mtnuganda';

      const url = getCorrectMomoUrl(baseUrl, '/collection/token/');
      
      console.log(`MTN MoMo Proxy: Fetching token from ${url}`);
      console.log(`- Target Environment: ${targetEnvironment}`);
      console.log(`- User ID: ${userId ? 'SET' : 'MISSING'}`);
      console.log(`- API Key: ${apiKey ? 'SET' : 'MISSING'}`);
      console.log(`- Sub Key: ${subscriptionKey ? 'SET' : 'MISSING'}`);
      
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

  app.post('/api/momo/requesttopay', verifyFirebaseToken, async (req, res) => {
    try {
      const { body } = req.body;
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      let targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
      if (targetEnvironment === 'production') targetEnvironment = 'mtnuganda';

      console.log(`MTN MoMo Proxy: Initiating requestToPay`);
      console.log(`- Base URL: ${baseUrl}`);
      console.log(`- Target Environment: ${targetEnvironment}`);
      console.log(`- Body:`, JSON.stringify(body));

      // AUTO-CORRECTION: Sandbox environment ONLY supports EUR. 
      // Production (e.g. 'mtnuganda') supports UGX.
      if (body) {
        const originalCurrency = body.currency;
        body.currency = targetEnvironment === 'sandbox' ? 'EUR' : (process.env.MTN_MOMO_CURRENCY || 'UGX');
        console.log(`- Currency: ${body.currency} (Original: ${originalCurrency})`);
      }

      const tokenResponse = await fetch(`http://localhost:3000/api/momo/token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get token for requestToPay');
      const { access_token: token } = await tokenResponse.json();

      const referenceId = uuidv4();
      const url = getCorrectMomoUrl(baseUrl, '/collection/v1_0/requesttopay');
      
      console.log(`MTN MoMo Proxy: Sending POST to ${url} with X-Reference-Id: ${referenceId}`);

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

      console.log(`MTN MoMo Proxy: Request accepted (202). ReferenceId: ${referenceId}`);
      res.status(202).json({ referenceId });
    } catch (error: any) {
      console.error('MTN MoMo Proxy Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/momo/status/:referenceId', verifyFirebaseToken, async (req, res) => {
    try {
      const { referenceId } = req.params;
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      let targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
      if (targetEnvironment === 'production') targetEnvironment = 'mtnuganda';

      const tokenResponse = await fetch(`http://localhost:3000/api/momo/token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get token for status check');
      const { access_token: token } = await tokenResponse.json();

      const url = getCorrectMomoUrl(baseUrl, `/collection/v1_0/requesttopay/${referenceId}`);
      
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
      console.log(`MTN MoMo Proxy: Status for ${referenceId}:`, data.status || 'UNKNOWN', data);
      res.json(data);
    } catch (error: any) {
      console.error('MTN MoMo Proxy Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Disbursement Endpoints for Affiliate Transfers
  app.post('/api/momo/disburse/token', verifyFirebaseToken, async (req, res) => {
    try {
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const userId = process.env.MTN_MOMO_DISBURSE_USER_ID || process.env.MTN_MOMO_USER_ID || '';
      const apiKey = process.env.MTN_MOMO_DISBURSE_API_KEY || process.env.MTN_MOMO_API_KEY || '';
      const subscriptionKey = process.env.MTN_MOMO_DISBURSE_SUBSCRIPTION_KEY || process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      let targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
      if (targetEnvironment === 'production') targetEnvironment = 'mtnuganda';

      const url = getCorrectMomoUrl(baseUrl, '/disbursement/token/');
      const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `MTN API returned ${response.status}`, details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/momo/transfer', verifyFirebaseToken, async (req, res) => {
    try {
      const { body } = req.body;
      const baseUrl = process.env.MTN_MOMO_API_BASE_URL || 'https://momoapi.mtn.com';
      const subscriptionKey = process.env.MTN_MOMO_DISBURSE_SUBSCRIPTION_KEY || process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
      let targetEnvironment = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
      if (targetEnvironment === 'production') targetEnvironment = 'mtnuganda';

      if (body) {
        body.currency = targetEnvironment === 'sandbox' ? 'EUR' : (process.env.MTN_MOMO_CURRENCY || 'UGX');
      }

      const tokenResponse = await fetch(`http://localhost:3000/api/momo/disburse/token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get token for transfer');
      const { access_token: token } = await tokenResponse.json();

      const referenceId = uuidv4();
      const url = getCorrectMomoUrl(baseUrl, '/disbursement/v1_0/transfer');
      
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
        return res.status(response.status).json({ error: `MTN API returned ${response.status}`, details: errorText });
      }

      res.status(202).json({ referenceId });
    } catch (error: any) {
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
