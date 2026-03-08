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
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <Helmet>
        <title>Forgot Password | YouNov</title>
      </Helmet>

      <div className="w-full max-w-md">
        <Card className="bg-white border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-800 text-center flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-accent-400" />
              忘记密码
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-stone-50 border-slate-200 text-slate-800"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-accent-600 hover:bg-accent-700">
                发送重置邮件
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-slate-200 pt-4">
            <span className="text-slate-500 text-sm">
              想起密码了？<Link to="/login" className="text-accent-400 hover:underline">返回登录</Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
