export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'PURCHASE' | 'DEDUCTION' | 'REFUND';
  description: string;
  createdAt: string;
  reference?: string;
}

export interface CreditTransactionDTO {
  userId: string;
  amount: number;
  type: 'PURCHASE' | 'DEDUCTION' | 'REFUND';
  description: string;
  reference?: string;
}