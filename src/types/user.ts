// types/user.ts
export interface User {
    id: string;
    email: string;
    credits: number;
    subscription: {
      status: 'active' | 'inactive' | 'cancelled';
      stripeSubscriptionId?: string;
      currentPeriodEnd?: string;
      monthlyCreditsAdded: boolean; 
    };
  }