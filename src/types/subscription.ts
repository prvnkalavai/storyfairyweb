export type SubscriptionTier = 'FREE' | 'PREMIUM';  

export interface SubscriptionState {  
tier: SubscriptionTier;  
isSubscribed: boolean;  
}  