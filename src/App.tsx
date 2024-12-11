// App.tsx
import React from 'react';
import { MsalProvider, MsalAuthenticationTemplate } from '@azure/msal-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoryGenerator } from './components/StoryGenerator';
import { StoryDisplay } from './components/StoryDisplay';
import { Header } from './components/Header';
import { AuthenticationModal } from './components/AuthenticationModal';
import AnimatedBackground from './components/AnimatedBackground';
import { msalInstance } from './authConfig';
import { InteractionType } from '@azure/msal-browser';

import { PaymentStatus } from './components/PaymentStatus';
import { MyStories } from './pages/MyStoriesPage';
import { AboutPage } from './pages/AboutPage';
import { StoryViewerPage } from './components/MyStories/StoryViewerPage';


const App: React.FC = () => {
    
    return (
        <MsalProvider instance={msalInstance}>
            <Router>
                <div className="min-h-screen relative">
                    <AnimatedBackground />
                    <div className="relative z-10">
                        <Header />
                        <AuthenticationModal />
                        <Routes>
                            <Route path="/" element={<StoryGenerator />} />
                            <Route
                                path="/story"
                                element={
                                    <MsalAuthenticationTemplate
                                        interactionType={InteractionType.Redirect}
                                        authenticationRequest={{ scopes: [] }}
                                        errorComponent={ErrorComponent}
                                        loadingComponent={LoadingComponent}
                                    >
                                        <StoryDisplay />
                                    </MsalAuthenticationTemplate>
                                }
                            />
                            <Route path="/payment-status" element={<PaymentStatus />} />
                            
                            <Route
                                path="/mystories"
                                element={
                                    <MsalAuthenticationTemplate
                                        interactionType={InteractionType.Redirect}
                                        authenticationRequest={{ scopes: [] }}
                                    >
                                        <MyStories/>
                                    </MsalAuthenticationTemplate>
                                }
                            />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/story/:storyId" element={<StoryViewerPage />} />  
                        </Routes>
                    </div>
                </div>
            </Router>
        </MsalProvider>
    );
};

function ErrorComponent({ error }: { error: any }) {
    const getErrorMessage = (error: any) => {
        if (error.errorMessage) {
            return error.errorMessage;
        }
        switch (error.errorCode) {
            case 'user_cancelled':
                return 'Login was cancelled';
            case 'consent_required':
                return 'Please consent to the required permissions';
            default:
                return `Authentication failed: ${error.message}`;
        }
    };
    
    return (
        <div className="error-container">
            <h3>Authentication Error</h3>
            <p>{getErrorMessage(error)}</p>
            <button onClick={() => window.location.href = '/'}>
                Return to Home
            </button>
        </div>
    );
}

function LoadingComponent() {
    return <p>Authenticating...</p>;
}

export default App;
