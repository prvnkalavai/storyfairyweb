import React from 'react';
import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface CustomDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  open, 
  onClose, 
  title, 
  description, 
  children
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="authentication-dialog-title"
      aria-describedby="authentication-dialog-description"
    >
      <DialogTitle id="authentication-dialog-title">
        {title}
      </DialogTitle>
      {description && (
        <DialogContentText 
          id="authentication-dialog-description" 
          className="px-4 text-center"
        >
          {description}
        </DialogContentText>
      )}
      <DialogContent>
        {children}
      </DialogContent>
    </Dialog>
  );
};