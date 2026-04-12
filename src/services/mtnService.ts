/// <reference types="vite/client" />
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../firebase';

class MTNMoMoService {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {}

  private async getAuthHeader(): Promise<Record<string, string>> {
    const idToken = await auth.currentUser?.getIdToken();
    return idToken ? { 'Authorization': `Bearer ${idToken}` } : {};
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const authHeader = await this.getAuthHeader();
    const response = await fetch('/api/momo/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.details 
        ? `${error.error}: ${error.details}` 
        : (error.error || 'Failed to get MTN MoMo access token');
      throw new Error(message);
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer of 1 minute
    return this.token!;
  }

  async requestToPay(amount: number, currency: string, phoneNumber: string, externalId: string): Promise<string> {
    const authHeader = await this.getAuthHeader();
    const response = await fetch('/api/momo/requesttopay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        body: {
          amount: amount.toString(),
          currency: currency,
          externalId: externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: 'Payment for goods/services',
          payeeNote: 'JENA POS Transaction',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.details 
        ? `${errorData.error}: ${errorData.details}` 
        : (errorData.error || 'MTN MoMo Request to Pay failed');
      throw new Error(message);
    }

    const { referenceId } = await response.json();
    return referenceId;
  }

  async getTransactionStatus(referenceId: string): Promise<'SUCCESSFUL' | 'FAILED' | 'PENDING'> {
    const authHeader = await this.getAuthHeader();
    const response = await fetch(`/api/momo/status/${referenceId}`, {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.details 
        ? `${error.error}: ${error.details}` 
        : (error.error || 'Failed to get MTN MoMo transaction status');
      throw new Error(message);
    }

    const data = await response.json();
    return data.status;
  }

  async transfer(amount: number, currency: string, phoneNumber: string, externalId: string): Promise<string> {
    const authHeader = await this.getAuthHeader();
    const response = await fetch('/api/momo/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        body: {
          amount: amount.toString(),
          currency: currency,
          externalId: externalId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: 'Affiliate Commission Payout',
          payeeNote: 'JENA POS Affiliate Program',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.details 
        ? `${errorData.error}: ${errorData.details}` 
        : (errorData.error || 'MTN MoMo Transfer failed');
      throw new Error(message);
    }

    const { referenceId } = await response.json();
    return referenceId;
  }
}

export const mtnMoMoService = new MTNMoMoService();
