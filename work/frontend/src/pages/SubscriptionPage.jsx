import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Check, Coins, Ticket } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/apiClient';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    priceLabel: '$9.90/mo',
    features: [{ name: '解锁付费章节（订阅权限）' }, { name: '订阅奖励积分 +10' }]
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: '$19.90/mo',
    popular: true,
    features: [{ name: '更高等级订阅' }, { name: '订阅奖励积分 +20' }]
  },
  {
    id: 'svip',
    name: 'SVIP',
    priceLabel: '$29.90/mo',
    features: [{ name: '最高等级订阅' }, { name: '订阅奖励积分 +30' }]
  }
];

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [points, setPoints] = useState(0);
  const [promoCode, setPromoCode] = useState('');

  const activePlanId = useMemo(() => subscription?.planId || null, [subscription]);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setSubscription(null);
        setPoints(0);
        return;
      }
      try {
        const data = await apiFetch('/users/me/home');
        setSubscription(data.subscription || null);
        setPoints(data.user?.pointsBalance || 0);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user]);

  const handleSubscribe = async (planId) => {
    if (!user) return navigate('/login');
    setLoading(true);
    try {
      const data = await apiFetch('/subscriptions/checkout', {
        method: 'POST',
        body: { planId, promoCode: promoCode.trim() ? promoCode.trim() : undefined }
      });

      if (data.mode === 'stripe' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setSubscription(data.subscription || null);
      setPoints(data.user?.pointsBalance || points);
      toast({
        title: '订阅已开通',
        description: `当前方案：${planId}`,
        className: 'bg-green-600 text-white border-none'
      });
    } catch (e) {
      toast({
        title: '订阅失败',
        description: e?.error === 'billing_not_configured' ? '支付未配置（请稍后补充密钥）' : (e?.error || '请稍后重试'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page font-sans text-slate-800">
      <Helmet><title>YouNov - Subscription</title></Helmet>
      <Header />

      {user && (
        <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-full border border-amber-200">
                <Coins className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Points / Coins</p>
                <p className="text-3xl font-bold text-slate-800">{points.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-slate-200 w-full md:w-auto flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 text-slate-700">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">优惠码</span>
              </div>
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="PROMO2026"
                className="w-56 bg-white border-slate-200 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">订阅开通</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          开通订阅后可直接阅读付费章节；支付密钥可先留空，后续补充后即可切换到真实支付。
        </p>
      </div>

      <div className="container mx-auto px-4 pb-20 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan, index) => {
            const isCurrent = activePlanId === plan.id && subscription && new Date(subscription.expiresAt) > new Date();
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative rounded-2xl p-8 backdrop-blur-sm flex flex-col border shadow-xl transition-all duration-300
                  ${plan.popular ? 'bg-gradient-to-b from-accent-50 to-white border-accent-400 scale-105 z-10 shadow-lg' : 'bg-white border-slate-200 hover:border-accent-300 shadow-sm'}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-600 text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-accent-900/50">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-slate-800">{plan.priceLabel}</span>
                  </div>
                  {subscription?.expiresAt && (
                    <p className="text-xs text-slate-400 mt-2">
                      {isCurrent ? `到期：${new Date(subscription.expiresAt).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0" /> {f.name}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading || isCurrent}
                  className={`w-full py-6 font-bold tracking-wide shadow-lg ${plan.popular ? 'bg-accent-600 hover:bg-accent-700 text-white shadow-accent-900/20' : 'bg-stone-200 hover:bg-stone-300 text-slate-800'}`}
                >
                  {loading ? '处理中...' : isCurrent ? '当前方案' : '立即开通'}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
