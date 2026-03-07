
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, ArrowRight, Zap, CreditCard } from 'lucide-react';

const PointsExchangeActivity = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 mb-8">
      <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Coins className="w-24 h-24" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Earn Points</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Subscribe to any plan to earn reward points instantly.
                <br />
                <span className="text-indigo-300 font-medium">Basic: 10pts • Premium: 20pts • SVIP: 30pts</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 border-amber-500/30 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <CreditCard className="w-24 h-24" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <ArrowRight className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Exchange for Discounts</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Use your points on your next subscription purchase.
                <br />
                <span className="text-amber-300 font-bold text-lg">10 Points = $1.00 Discount</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PointsExchangeActivity;
