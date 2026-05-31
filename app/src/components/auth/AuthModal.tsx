/**
 * Authentication Modal
 * Handles login, signup, and password reset
 */

import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useOptionalAuth } from '@/lib/auth/AuthContext';
type Provider = 'google';
import { 
  getStoredReferralCode, 
  storeReferralCode, 
  recordSignupEvent,
  validatePromoCode,
} from '@/lib/promo';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  onAuthenticated?: () => void;
}

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login', onAuthenticated }: AuthModalProps) {
  const { signIn, signUp, resetPassword, isAuthenticated } = useOptionalAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  
  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; message: string } | null>(null);
  
  // OAuth state
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const finishAuthenticated = () => {
    if (onAuthenticated) {
      onAuthenticated();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const storedCode = getStoredReferralCode();
    if (storedCode) {
      setPromoCode(storedCode);
      // Auto-validate stored code
      validatePromoCode(storedCode).then((result) => {
        if (result.valid) {
          setCodeValidation({ valid: true, message: `${result.discount_percent}% discount applied!` });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setShowResetForm(false);
      setError(null);
      setSuccess(null);
    }
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      finishAuthenticated();
    }
    
    setIsLoading(false);
  };

  const handlePromoCodeChange = async (value: string) => {
    setPromoCode(value.toUpperCase());
    setCodeValidation(null);
    
    if (value.length >= 3) {
      setIsValidatingCode(true);
      const result = await validatePromoCode(value);
      setIsValidatingCode(false);
      
      if (result.valid) {
        setCodeValidation({ valid: true, message: `${result.discount_percent}% discount applied!` });
        storeReferralCode(value);
      } else {
        setCodeValidation({ valid: false, message: 'Invalid promo code' });
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error, data } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      promo_code: promoCode || undefined,
    });
    
    if (error) {
      setError(error.message);
    } else {
      // Record referral event if user was created and has promo code
      if (data?.user && promoCode) {
        await recordSignupEvent(data.user.id, {
          email,
          first_name: firstName,
          last_name: lastName,
        });
      }
      setSuccess('Account created. You are signed in and your progress can now sync across devices.');
      finishAuthenticated();
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password reset instructions sent to your email!');
    }
    
    setIsLoading(false);
  };

  const handleOAuthSignIn = async (_provider: Provider) => {
    setIsOAuthLoading(true);
    setError('OAuth sign-in is no longer supported. Please use email and password.');
    setIsOAuthLoading(false);
  };

  // If already authenticated, show success message
  if (isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-sky-50 shadow-2xl shadow-emerald-200/70">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600" />
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-950 mb-2">You're signed in!</h2>
            <p className="text-slate-700 mb-4">Your progress will be saved to the cloud.</p>
            <Button onClick={finishAuthenticated} className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white hover:from-blue-800 hover:to-cyan-700">
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/95 to-cyan-50/80 shadow-2xl shadow-blue-200/70">
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-500" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-950">
            {showResetForm ? 'Reset Password' : activeTab === 'signup' ? 'Sign up' : 'Sign in'}
          </CardTitle>
          <CardDescription className="text-slate-700">
            {showResetForm 
              ? 'Enter your email to receive reset instructions'
              : activeTab === 'signup'
                ? 'Save progress, use your dashboard, and keep practicing across devices'
                : 'Sign in to sync your progress across devices'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-emerald-50 border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <AlertDescription className="text-emerald-800">{success}</AlertDescription>
            </Alert>
          )}

          {showResetForm ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="font-semibold text-slate-900">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="border-slate-300 bg-white pl-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Back to login
              </button>
            </form>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
              <TabsList className="mb-6 grid h-12 w-full grid-cols-2 rounded-xl border border-blue-200 bg-blue-50/80 p-1 shadow-inner">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-base font-extrabold text-blue-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-base font-extrabold text-blue-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-semibold text-slate-900">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-slate-300 bg-white pl-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="font-semibold text-slate-900">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-slate-300 bg-white pl-10 pr-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Forgot password?
                  </button>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  {/* OAuth Sign In Options */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-blue-50 px-2 text-slate-600">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-blue-200 bg-white text-slate-950 hover:bg-blue-50"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={isOAuthLoading}
                  >
                    <GoogleIcon className="w-4 h-4 mr-2" />
                    {isOAuthLoading ? 'Connecting...' : 'Google'}
                  </Button>

                  <p className="text-xs text-slate-600 text-center">
                    You can also use the app without signing in. Your data will be stored locally.
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="font-semibold text-slate-900">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="first-name"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="border-slate-300 bg-white pl-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="font-semibold text-slate-900">Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-semibold text-slate-900">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-slate-300 bg-white pl-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="font-semibold text-slate-900">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-slate-300 bg-white pl-10 pr-10 text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">Must be at least 6 characters</p>
                  </div>

                  {/* Promo Code Input */}
                  <div className="space-y-2">
                    <Label htmlFor="promo-code" className="font-semibold text-slate-900">Promo Code (Optional)</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="promo-code"
                        type="text"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => handlePromoCodeChange(e.target.value)}
                        className={cn(
                          "border-slate-300 bg-white pl-10 uppercase text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500",
                          codeValidation?.valid && "border-emerald-300 focus-visible:ring-emerald-200",
                          codeValidation && !codeValidation.valid && "border-amber-300 focus-visible:ring-amber-200"
                        )}
                        disabled={isValidatingCode}
                      />
                      {codeValidation?.valid && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    {codeValidation && (
                      <p className={cn(
                        "text-xs",
                        codeValidation.valid ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {codeValidation.message}
                      </p>
                    )}
                    {!codeValidation && promoCode && promoCode.length < 3 && (
                      <p className="text-xs text-slate-600">
                        Enter a valid promo code for discount
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                  </Button>

                  {/* OAuth Sign Up Options */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-blue-50 px-2 text-slate-600">Or sign up with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-blue-200 bg-white text-slate-950 hover:bg-blue-50"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={isOAuthLoading}
                  >
                    <GoogleIcon className="w-4 h-4 mr-2" />
                    {isOAuthLoading ? 'Connecting...' : 'Google'}
                  </Button>

                  <p className="text-xs text-slate-600 text-center">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
