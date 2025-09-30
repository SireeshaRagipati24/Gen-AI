// src/components/InstagramVerification.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RocketIcon, CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface InstagramVerificationProps {
  onVerified: () => void;
}

const InstagramVerification: React.FC<InstagramVerificationProps> = ({ onVerified }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/verify-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => onVerified(), 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <RocketIcon className="w-12 h-12 mx-auto text-blue-500" />
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Connect Instagram</h2>
        <p className="mt-1 text-gray-600">
          Verify your Instagram credentials to start posting content
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success ? (
        <Alert className="mb-4">
          <CheckCircledIcon className="h-4 w-4 text-green-500" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Instagram credentials verified. You can now post content.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Instagram Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your Instagram username"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Instagram Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Instagram password"
              required
            />
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Your credentials are securely stored and only used to post content to your account.</p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify Credentials"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default InstagramVerification;