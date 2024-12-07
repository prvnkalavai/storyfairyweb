// components/CreditDialogs.tsx
import React from 'react';
import { 
Dialog, 
DialogTitle, 
DialogContent, 
DialogActions, 
Button, 
Card, 
CardContent, 
Typography,
Grid
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { CreditPackage } from '../types/credits';
import { getAuthToken } from '../utils/auth'; 

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log("StripePromise: ",stripePromise)
console.log('API_BASE_URL:', API_BASE_URL);

interface ConfirmationDialogProps {
open: boolean;
creditsNeeded: number;
onConfirm: () => void;
onClose: () => void;
}

interface PurchaseDialogProps {
open: boolean;
onClose: () => void;
onPurchase: (packageId: string) => void;
currentCredits: number;
creditsNeeded: number;
packages: CreditPackage[];
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
open,
creditsNeeded,
onConfirm,
onClose
}) => (
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Confirm Credit Usage</DialogTitle>
  <DialogContent>
    <Typography>
      This action will use {creditsNeeded} credits. Are you sure you want to proceed?
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose} color="primary">
      Cancel
    </Button>
    <Button onClick={onConfirm} variant="contained" color="primary">
      Confirm
    </Button>
  </DialogActions>
</Dialog>
);

export const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
open,
onClose,
onPurchase,
currentCredits,
creditsNeeded,
packages
}) => {
const handlePurchase = async (packageId: string) => {
  try {
    // Get Stripe instance
    const stripe = await stripePromise;
    const token = await getAuthToken();
    const apiUrl = `${API_BASE_URL}/api/credits/purchase`;
    if (!stripe) throw new Error('Stripe failed to load');

    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    if (!selectedPackage) throw new Error('Invalid package selected');

    console.log('Calling API URL:', apiUrl);
    // Create checkout session
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-My-Auth-Token': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ packageId: selectedPackage.stripePriceId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe checkout
    const result = await stripe.redirectToCheckout({
      sessionId
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Close dialog after successful redirect
    onClose();

  } catch (error) {
    console.error('Purchase failed:', error);
    // Handle error (show error message to user)
  }
};

return (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>Purchase Credits</DialogTitle>
    <DialogContent>
      <Typography variant="subtitle1" color="error" gutterBottom>
        You need {creditsNeeded - currentCredits} more credits to generate this story.
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Current balance: {currentCredits} credits
      </Typography>
      <Grid container spacing={3}>
        {packages.map((pkg) => (
          <Grid item xs={12} md={4} key={pkg.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 }
              }}
              onClick={() => handlePurchase(pkg.id)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {pkg.name}
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  ${pkg.price}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {pkg.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);
};