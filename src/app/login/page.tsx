'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';
import { BrandPanel } from '@/components/Login/BrandPanel';
import { SignInCard } from '@/components/Login/SignInCard';

export default function LoginPage() {
  const { isAuthenticated, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/');
  }, [loading, isAuthenticated, router]);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    setError(null);
    setSigningIn(true);
    const result = await signInWithGoogle(credentialResponse.credential);
    setSigningIn(false);
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <BrandPanel />
      <SignInCard
        signingIn={signingIn}
        error={error}
        onSuccess={handleSuccess}
        onError={() => setError('Google sign-in failed. Please try again.')}
      />
    </div>
  );
}
