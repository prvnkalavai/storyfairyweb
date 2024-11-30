// constants/credits.ts
import { CreditPackage } from "../types/credits";
export const STORY_CREDIT_COSTS = {
    SHORT: 5,
    MEDIUM: 7,
    LONG: 9,
    EPIC: 12,
    SAGA: 15
  } as const;
  
  export const CREDIT_PACKAGES: CreditPackage[] = [
    {
      id: 'basic',
      credits: 10,
      price: 1.99,
      name: 'Basic Pack',
      description: '10 credits - Perfect for creating short stories',
      stripePriceId: 'price_1QQdixFLmjK5620zB4pBnHqd'
    },
    {
      id: 'popular',
      credits: 25,
      price: 3.99,
      name: 'Popular Pack',
      description: '25 credits - Great value for medium stories',
      stripePriceId: 'price_1QQdjuFLmjK5620zkNHkpcPE'
    },
    {
      id: 'premium',
      credits: 60,
      price: 7.99,
      name: 'Premium Pack',
      description: '60 credits - Best value for long stories',
      stripePriceId: 'price_1QQdlBFLmjK5620zTwrUJmd5'
    }
  ];