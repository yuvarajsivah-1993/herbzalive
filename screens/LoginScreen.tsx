// FIX: Update react-router-dom import for v5 compatibility
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHeart, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';
import { FirebaseUser } from '../types';
import ConfirmationModal from '../components/ui/ConfirmationModal';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLink: (email: string) => Promise<void>;
  initialEmail?: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSendLink, initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (isOpen) {
          setEmail(initialEmail);
      }
  }, [isOpen, initialEmail]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      await onSendLink(email);
      addToast('Password reset link sent! Please check your inbox.', 'success');
      onClose();
    } catch (err: any) {
      let errorMessage = 'Failed to send reset link. Please try again.';
      if (err.code === 'auth/user-not-found') {
          errorMessage = 'No user found with this email address.';
      }
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reset Your Password</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          <div className="p-6">
            <Input
              id="reset-email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />}
            />
          </div>
          <div className="flex justify-end space-x-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
            <Button type="button" variant="light" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, sendPasswordResetEmail } = useAuth();
  const { addToast } = useToast();
  
  // State for email verification modal
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; user: FirebaseUser | null }>({ isOpen: false, user: null });
  const [isForgotPassModalOpen, setIsForgotPassModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.isVerificationError) {
          setVerificationModal({ isOpen: true, user: err.firebaseUser });
      } else if (err.message.includes('inactive') || err.message.includes('not found')) {
          addToast(err.message, 'error');
      } else {
          addToast('Failed to sign in. Please check your credentials.', 'error');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
      if (!verificationModal.user) return;
      try {
          await verificationModal.user.sendEmailVerification();
          addToast("A new verification link has been sent to your email.", 'success');
      } catch (error) {
          addToast("Failed to resend verification link. Please try again later.", 'error');
      } finally {
          setVerificationModal({ isOpen: false, user: null });
      }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <FontAwesomeIcon icon={faShieldHeart} className="mx-auto h-12 w-auto text-blue-600" />
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Zendenta Portal
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <ForgotPasswordModal
          isOpen={isForgotPassModalOpen}
          onClose={() => setIsForgotPassModalOpen(false)}
          onSendLink={sendPasswordResetEmail}
          initialEmail={email}
        />
        <ConfirmationModal
            isOpen={verificationModal.isOpen}
            onClose={() => setVerificationModal({ isOpen: false, user: null })}
            onConfirm={handleResendVerification}
            title="Email Verification Required"
            message="Please check your inbox to verify your email address. If you don't see the email, you can request a new one."
            confirmButtonText="Resend Verification Link"
            confirmButtonVariant="primary"
        />
        <Card className="p-6 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => setIsForgotPassModalOpen(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed pl-10"
                />
              </div>
            </div>
            
            <div>
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>
           <div className="mt-6 text-center text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                Staff or Patient? Use the form above.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;