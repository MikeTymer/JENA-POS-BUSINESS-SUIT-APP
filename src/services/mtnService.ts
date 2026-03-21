/// <reference types="vite/client" />
import { v4 as uuidv4 } from 'uuid';

interface MoMoConfig {
  baseUrl: string;
  userId: string;
  apiKey: string;
  subscriptionKey: string;
  environment: string;
}

class MTNMoMoService {
  private config: MoMoConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_MTN_MOMO_API_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
      userId: import.meta.env.VITE_MTN_MOMO_USER_ID || '',
      apiKey: import.meta.env.VITE_MTN_MOMO_API_KEY || '',
      subscriptionKey: import.meta.env.VITE_MTN_MOMO_SUBSCRIPTION_KEY || '',
      environment: import.meta.env.VITE_MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox',
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const auth = btoa(`${this.config.userId}:${this.config.apiKey}`);
    const response = await fetch(`${this.config.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get MTN MoMo access token');
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer of 1 minute
    return this.token!;
  }

  async requestToPay(amount: number, currency: string, phoneNumber: string, externalId: string): Promise<string> {
    const token = await this.getAccessToken();
    const referenceId = uuidv4();

    const response = await fetch(`${this.config.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': this.config.environment,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: currency,
        externalId: externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage: 'Payment for goods/services',
        payeeNote: 'JENA POS Transaction',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'MTN MoMo Request to Pay failed');
    }

    return referenceId;
  }

  async getTransactionStatus(referenceId: string): Promise<'SUCCESSFUL' | 'FAILED' | 'PENDING'> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': this.config.environment,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get MTN MoMo transaction status');
    }

    const data = await response.json();
    return data.status;
  }
}

export const mtnMoMoService = new MTNMoMoService();
