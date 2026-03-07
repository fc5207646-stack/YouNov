import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) setReferralCode(ref);
  }, [location.search]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !displayName || !password) {
      toast({ variant: 'destructive', title: '错误', description: '请填写完整信息' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: '错误', description: '两次密码不一致' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(email, password, {
        data: {
          displayName,
          username: username || undefined,
          referralCode: referralCode || undefined
        }
      });
      if (error) throw error;
      toast({ title: '注册成功', description: '已自动登录', className: 'bg-green-600 text-white border-none' });
      navigate('/profile');
    } catch (err) {
      toast({ variant: 'destructive', title: '注册失败', description: err?.error || err?.message || '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Decor */}
       <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>

       <Helmet><title>Register | YouNov</title></Helmet>
       
       <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
               YouNov
            </Link>
            <h1 className="text-white text-xl font-medium">Create Account</h1>
          </div>

          <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md">
             <CardHeader>
                <CardTitle className="text-white text-center">
                   注册账号
                </CardTitle>
             </CardHeader>

             <CardContent>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="你的昵称"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Username（可选）</Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="仅字母数字下划线"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="至少 6 位"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="再次输入密码"
                      required
                    />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <Label className="text-purple-400 flex items-center gap-2 cursor-pointer">
                      <Gift className="w-4 h-4" /> 邀请码（可选）
                    </Label>
                    <Input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-purple-300 placeholder:text-slate-600 text-center font-mono tracking-widest uppercase"
                      placeholder="uabc123"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-900/20 h-11 text-base font-medium"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "完成注册"}
                  </Button>
                </form>
             </CardContent>
             
             <CardFooter className="justify-center border-t border-slate-800 pt-4">
                <span className="text-slate-500 text-sm">
                   Already have an account? <Link to="/login" className="text-purple-400 hover:underline">Log in</Link>
                </span>
             </CardFooter>
          </Card>
       </div>
    </div>
  );
};

export default RegisterPage;