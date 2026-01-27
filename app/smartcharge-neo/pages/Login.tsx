import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, User, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let success: boolean;
      if (isLogin) {
        success = await login(email);
      } else {
        success = await register(email, name);
      }

      if (success) {
        navigate('/');
      } else {
        setError(isLogin ? 'Login failed. Please check your email.' : 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1019] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-2xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="size-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
             <Zap className="text-white fill-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-text-secondary text-sm text-center">
            {isLogin ? 'Enter your email to access your dashboard' : 'Sign up to start managing your EV charging'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
           {!isLogin && (
             <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full bg-bg-dark border border-border-dark rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-text-secondary/50"
                    placeholder="Jean Dupont"
                  />
                </div>
             </div>
           )}

           <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-secondary" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg-dark border border-border-dark rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-text-secondary/50"
                  placeholder="name@example.com"
                />
              </div>
           </div>

           <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-secondary" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-dark border border-border-dark rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-text-secondary/50"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-text-secondary/70 mt-1">Password is optional for demo purposes</p>
           </div>

           <button
             type="submit"
             disabled={isLoading}
             className="mt-4 w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isLoading ? (
               <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : (
               <>
                 {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} />
               </>
             )}
           </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-dark text-center">
          <p className="text-sm text-text-secondary">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="ml-2 text-primary hover:text-white font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
