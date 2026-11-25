'use client';

import React, { useState } from 'react';
import { X, Check, Shield, User, LogOut, AlertCircle } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  isSignedIn: boolean;
}

interface GoogleJwtPayload {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSignIn: (profile: UserProfile) => void;
  onSignOut: () => void;
}

export default function GoogleSignInModal({ isOpen, onClose, user, onSignIn, onSignOut }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        setErrorMessage('No credentials returned from Google');
        return;
      }
      const decoded: GoogleJwtPayload = jwtDecode(credentialResponse.credential);
      const email = decoded.email || 'investor@gmail.com';
      const name = decoded.name || email.split('@')[0];
      const picture = decoded.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

      const profile: UserProfile = {
        name,
        email,
        picture,
        isSignedIn: true
      };

      setErrorMessage(null);
      onSignIn(profile);
      onClose();
    } catch (err: any) {
      console.error('Google decode error:', err);
      setErrorMessage('Failed to decode Google account. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setErrorMessage('Google Authentication was cancelled or failed. Please check popup permissions.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {user?.isSignedIn ? (
          /* User is already signed in */
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/20 mx-auto overflow-hidden flex items-center justify-center shadow-xs">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold mb-1">
                <Check className="w-4 h-4" /> Signed in with Google Cloud
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Shield className="w-4 h-4 text-emerald-600" /> Google Cloud OAuth 2.0 Connected
              </div>
              <p className="text-[11px] text-slate-500">
                Your portfolio, custom stock watchlists, and algorithmic orders are secured and synced across your devices.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onSignOut}
                className="flex-1 py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Sign-In flow */
          <div className="space-y-5">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mx-auto flex items-center justify-center mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Sign in to Stock Alpha</h2>
              <p className="text-xs text-slate-500 mt-1">
                Authenticate with your official Google account to sync your Indian stock portfolio &amp; order history
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Official Google Identity Services 1-Click Button */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="continue_with"
                  width="320"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Authorized OAuth 2.0 Client
              </div>
              <p>
                Connected to Google Cloud Console with secure JWT credential tokens. No passwords are ever stored.
              </p>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              Protected by Google Cloud IAM &amp; OAuth 2.0 security.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
