import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Transporter Setup
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Welcome Email Endpoint
  app.post('/api/email/welcome', async (req, res) => {
    const { email, businessName, businessId, loginUrl } = req.body;

    if (!email || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"JENA POS" <noreply@jena-pos.com>',
      to: email,
      subject: `Welcome to JENA POS - ${businessName} Created!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h2 style="color: #4f46e5;">Welcome to JENA POS!</h2>
          <p>Hello,</p>
          <p>Thank you for joining JENA POS. We are excited to help you manage your business more efficiently.</p>
          <p>Your business <strong>${businessName}</strong> (ID: ${businessId}) has been successfully created and is ready for use.</p>
          <div style="margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Your Dashboard</a>
          </div>
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p>${loginUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    try {
      // If no SMTP config, just log it (useful for preview/dev)
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        console.log('--- MOCK EMAIL SENT ---');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        console.log('Body:', mailOptions.html);
        console.log('-----------------------');
        return res.json({ success: true, message: 'Email logged to console (no SMTP config)' });
      }

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Welcome email sent successfully' });
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
  });

  // Generic Notification Email Endpoint
  app.post('/api/email/notification', async (req, res) => {
    const { email, title, message, businessName } = req.body;

    if (!email || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"JENA POS" <noreply@jena-pos.com>',
      to: email,
      subject: `[JENA POS] ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5;">New Notification</h2>
          ${businessName ? `<p style="font-weight: bold; color: #374151;">Business: ${businessName}</p>` : ''}
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <h3 style="margin-top: 0; color: #111827;">${title}</h3>
            <p style="color: #4b5563; line-height: 1.5;">${message}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">You can view more details by logging into your JENA POS dashboard.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">This is an automated notification from JENA POS. Please do not reply.</p>
        </div>
      `,
    };

    try {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        console.log('--- MOCK NOTIFICATION EMAIL SENT ---');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        console.log('-----------------------');
        return res.json({ success: true, message: 'Email logged to console (no SMTP config)' });
      }

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Notification email sent successfully' });
    } catch (error: any) {
      console.error('Error sending notification email:', error);
      res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
  });

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

  app.post('/api/momo/requesttopay', async (req, res) => {
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

  app.get('/api/momo/status/:referenceId', async (req, res) => {
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
  app.post('/api/momo/disburse/token', async (req, res) => {
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

  app.post('/api/momo/transfer', async (req, res) => {
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
