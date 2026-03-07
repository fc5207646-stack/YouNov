import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (event) => {
    event.preventDefault();
    toast({
      title: '暂未开放',
      description: '请联系管理员或稍后再试。'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Helmet>
        <title>Forgot Password | YouNov</title>
      </Helmet>

      <div className="w-full max-w-md">
        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              忘记密码
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                发送重置邮件
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-slate-800 pt-4">
            <span className="text-slate-500 text-sm">
              想起密码了？<Link to="/login" className="text-purple-400 hover:underline">返回登录</Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
