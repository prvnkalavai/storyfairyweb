import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, CircularProgress, Box } from '@mui/material';
import { getUserCredits } from '../services/creditService';

export const PaymentStatus: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const checkPaymentStatus = async () => {
            if (status === 'success' && sessionId) {
                try {
                    // Make multiple attempts to fetch updated credits
                    let retryCount = 0;
                    const maxRetries = 3;

                    while (retryCount < maxRetries) {
                        try {
                            await getUserCredits();
                            break; // Exit loop if successful
                        } catch (error) {
                            retryCount++;
                            if (retryCount === maxRetries) throw error;
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                        }
                    }

                    // Force navigation after 5 seconds regardless of credit fetch status
                    timeoutId = setTimeout(() => {
                        navigate('/', { 
                            state: { 
                                paymentSuccess: true,
                                sessionId 
                            },
                            replace: true // Use replace to prevent back navigation to payment status
                        });
                    }, 5000);

                } catch (error) {
                    console.error('Error in payment status:', error);
                    setError('Failed to verify payment status. You will be redirected shortly.');
                    timeoutId = setTimeout(() => {
                        navigate('/', { 
                            state: { 
                                paymentError: 'Payment completed but failed to update credits. Please contact support.',
                                sessionId
                            },
                            replace: true
                        });
                    }, 5000);
                }
            } else if (status === 'cancelled') {
                timeoutId = setTimeout(() => {
                    navigate('/', { 
                        state: { 
                            paymentCancelled: true 
                        },
                        replace: true
                    });
                }, 3000);
            }
            setLoading(false);
        };

        checkPaymentStatus();

        // Cleanup timeout on unmount
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [status, sessionId, navigate]);

    return (
        <Box className="flex justify-center items-center min-h-screen">
            {loading ? (
                <CircularProgress />
            ) : (
                <div>
                    {status === 'success' && (
                        <Alert severity="success">
                            Payment successful! Redirecting to home page...
                            {error && <div className="mt-2 text-sm">{error}</div>}
                        </Alert>
                    )}
                    {status === 'cancelled' && (
                        <Alert severity="info">
                            Payment cancelled. Redirecting to home page...
                        </Alert>
                    )}
                </div>
            )}
        </Box>
    );
};
