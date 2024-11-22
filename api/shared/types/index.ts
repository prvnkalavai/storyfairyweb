import { Resource } from '@azure/cosmos';

export interface CosmosResource extends Resource {
  id: string;
  _rid: string;
  _self: string;
  _etag: string;
  _attachments: string;
  _ts: number;
}

export interface User extends CosmosResource {
  userId: string;
  email: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction extends CosmosResource {
  userId: string;
  amount: number;
  type: 'PURCHASE' | 'DEDUCTION' | 'REFUND';
  description: string;
  createdAt: string;
  reference?: string;
}

export interface AddCreditsRequest {
  amount: number;
  description?: string;
  reference?: string;
}

export interface DeductCreditsRequest {
  amount: number;
  description?: string;
}