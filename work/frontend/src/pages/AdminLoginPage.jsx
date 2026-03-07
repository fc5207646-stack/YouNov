import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, Lock, Loader2 } from 'lucide-react';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await signIn({ email, password });
      
      if (authError) throw authError;
      if (!authData || !authData.user) {
        throw new Error("Invalid credentials or login failed.");
      }

      if (authData.user.role !== 'ADMIN') {
        await signOut();
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This account does not have administrative privileges."
        });
      } else {
        toast({
          title: "Welcome Admin",
          description: "Successfully logged in to admin panel."
        });
        // Short delay to allow state updates to propagate
        setTimeout(() => navigate('/admin'), 100);
      }

    } catch (error) {
      console.error("Admin Login Error:", error);
      let errorMsg = "An unexpected error occurred.";
      try {
        if (typeof error?.message === 'string') {
          errorMsg = error.message;
        } else if (typeof error?.error === 'string') {
          errorMsg = error.error;
        } else if (error && typeof error === 'object') {
          errorMsg = JSON.stringify(error);
        }
      } catch (e) {
        errorMsg = "Login failed (unparseable error)";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: String(errorMsg)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Helmet>
        <title>YouNov - Admin Login</title>
        <meta name="description" content="Administrative access only" />
      </Helmet>
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-purple-900/30 p-4 rounded-full mb-4 ring-1 ring-purple-500/30">
            <ShieldAlert className="w-10 h-10 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-2">Secure access area</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 pl-10 text-white placeholder:text-slate-500 focus:border-purple-500 h-11"
                placeholder="admin@example.com"
              />
              <ShieldAlert className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 pl-10 text-white placeholder:text-slate-500 focus:border-purple-500 h-11"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 h-11 transition-all hover:scale-[1.01] active:scale-[0.99]"
            disabled={loading}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</> : "Access Dashboard"}
          </Button>

          <div className="text-center mt-6 pt-4 border-t border-slate-800">
             <Link to="/login" className="text-xs text-slate-500 hover:text-purple-400 transition-colors">
               &larr; Return to regular login
             </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;