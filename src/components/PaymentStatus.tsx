// src/components/PaymentStatus.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, CircularProgress } from '@mui/material';
import { getUserCredits } from '../services/creditService';

export const PaymentStatus: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const status = searchParams.get('status');

    useEffect(() => {
        const checkPaymentStatus = async () => {
            if (status === 'success') {
                try {
                    // Fetch updated credits
                    await getUserCredits();

                    // Wait for 3 seconds to show success message
                    setTimeout(() => {
                        navigate('/', { 
                            state: { 
                                paymentSuccess: true 
                            }
                        });
                    }, 3000);
                } catch (error) {
                    console.error('Error fetching credits:', error);
                    navigate('/', { 
                        state: { 
                            paymentError: 'Failed to update credits. Please contact support.' 
                        }
                    });
                }
            } else if (status === 'cancelled') {
                setTimeout(() => {
                    navigate('/', { 
                        state: { 
                            paymentCancelled: true 
                        }
                    });
                }, 3000);
            }
            setLoading(false);
        };

        checkPaymentStatus();
    }, [status, navigate]);

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <div className="flex justify-center items-center min-h-screen">
            {status === 'success' && (
                <Alert severity="success">
                    Payment successful! Redirecting to home page...
                </Alert>
            )}
            {status === 'cancelled' && (
                <Alert severity="info">
                    Payment cancelled. Redirecting to home page...
                </Alert>
            )}
        </div>
    );
};