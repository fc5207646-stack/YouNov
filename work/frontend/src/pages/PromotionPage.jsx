import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, Gift, Users, Trophy, Zap, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/apiClient';

const PromotionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState(null);

  const siteOrigin = useMemo(() => import.meta.env.VITE_SITE_ORIGIN || window.location.origin, []);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setReferral(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await apiFetch('/users/me/home');
        setReferral(data.referral || null);
      } catch (e) {
        console.error(e);
        setReferral(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const copyToClipboard = async (text) => {
    if (!text) return;
    if (!navigator?.clipboard?.writeText) {
      toast({ variant: 'destructive', title: '复制失败', description: '浏览器不支持剪贴板操作' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: '已复制', description: '已复制到剪贴板' });
    } catch (_error) {
      toast({ variant: 'destructive', title: '复制失败', description: '请检查浏览器权限设置' });
    }
  };

  const referralCount = referral?.registers || 0;
  const currentLevel = referralCount < 5 ? 0 : (referralCount < 10 ? 1 : 2);
  const nextTarget = currentLevel === 0 ? 5 : currentLevel === 1 ? 10 : 10;
  const progress = currentLevel === 2 ? 100 : Math.min(100, Math.round((referralCount / nextTarget) * 100));

  return (
    <div className="min-h-screen bg-page">
      <Helmet><title>推广中心 | YouNov</title></Helmet>
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">邀请推广</h1>
          <p className="text-slate-600 text-lg">统计点击 / 注册 / 订阅，便于拉新与裂变增长</p>
        </div>

        {loading ? (
          <div className="text-center text-slate-400">Loading...</div>
        ) : !user ? (
          <Card className="bg-white border-slate-200 shadow-lg text-center p-8">
            <CardContent>
              <Gift className="w-16 h-16 text-accent-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">需要登录</h2>
              <p className="text-slate-600 mb-6">登录后可查看你的邀请码与推广数据</p>
              <Button asChild className="bg-accent-600 hover:bg-accent-700">
                <a href="/login">Login</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white border border-accent-200 mb-8 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-accent-500" />
                  你的邀请码
                </CardTitle>
                <CardDescription className="text-slate-600">分享邀请码或邀请链接给好友</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between bg-stone-50 rounded-lg p-4 border border-slate-200">
                  <span className="text-2xl font-mono font-bold text-slate-800">{referral?.code || '—'}</span>
                  <Button onClick={() => copyToClipboard(referral?.code)} variant="ghost" size="sm" className="text-accent-400 hover:text-accent-300">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between bg-stone-50 rounded-lg p-3 border border-slate-200">
                  <span className="text-slate-600 text-sm flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-500" />
                    邀请链接（注册页可填邀请码）
                  </span>
                  <Button
                    onClick={() => copyToClipboard(`${siteOrigin}/register?ref=${encodeURIComponent(referral?.code || '')}`)}
                    variant="ghost"
                    size="sm"
                    className="text-accent-400 hover:text-accent-300"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-slate-600">注册人数</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{referral?.registers || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span className="text-slate-600">当前等级</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">Level {currentLevel + 1}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <span className="text-slate-600">订阅转化</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{referral?.subscribes || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm mb-8">
              <CardHeader>
                <CardTitle className="text-slate-800">成长进度</CardTitle>
                <CardDescription className="text-slate-600">按注册人数升级（示例规则：5 / 10）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={progress} />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{referralCount} / {nextTarget}</span>
                  <span>{currentLevel === 2 ? '已满级' : `还差 ${Math.max(0, nextTarget - referralCount)} 人`}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-800">推广数据</CardTitle>
                <CardDescription className="text-slate-600">汇总统计</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-600 text-sm space-y-2">
                <div>点击：{referral?.clicks || 0}</div>
                <div>注册：{referral?.registers || 0}</div>
                <div>订阅：{referral?.subscribes || 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PromotionPage;

