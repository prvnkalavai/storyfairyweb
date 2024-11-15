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
import { CreditPackage } from '../types/credits';

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
}) => (
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
              onClick={() => onPurchase(pkg.id)}
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