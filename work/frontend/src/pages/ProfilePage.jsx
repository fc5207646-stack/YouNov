
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, BookOpen, Heart, Clock, Crown, Share2, Trophy, Coins, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PointsHistoryTable from '@/components/PointsHistoryTable';
import { apiFetch } from '@/lib/apiClient';

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch('/users/me/home');
        setProfile({ ...data.user, referral: data.referral, subscription: data.subscription });
        setReadingHistory(data.readingHistory || []);
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("Failed to load profile information.");
        toast({ variant: "destructive", title: "Error", description: "Could not load profile data." });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user, toast]);

  const copyReferralCode = () => {
    if (profile?.referral?.code) {
      navigator.clipboard.writeText(profile.referral.code);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading profile...</div>;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const isPremium = Boolean(profile?.subscription?.expiresAt) && new Date(profile.subscription.expiresAt) > new Date();
  const isExpired = !isPremium;

  return (
    <div className="min-h-screen bg-slate-950">
      <Helmet>
        <title>YouNov - My Profile | 尤诺夫·小说阅读平台</title>
        <meta name="description" content="Manage your YouNov profile, reading history, and subscription settings." />
      </Helmet>

      <Header />

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-lg p-8 mb-8 border border-purple-500/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{user?.email}</h1>
                  <p className="text-slate-300">{profile?.displayName}</p>
                  {isPremium && !isExpired && (
                    <div className="flex items-center gap-2 mt-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-500 font-semibold uppercase">{profile?.subscription?.planId} Member</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400">Reading History</span>
              </div>
              <p className="text-3xl font-bold text-white">{readingHistory.length}</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="text-slate-400">Favorites</span>
              </div>
              <p className="text-3xl font-bold text-white">-</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <Share2 className="w-5 h-5 text-green-400" />
                <span className="text-slate-400">Referral Code</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{profile?.referral?.code || '—'}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyReferralCode}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="bg-slate-800 border border-slate-700 w-full md:w-auto">
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-500">
                <Clock className="w-4 h-4 mr-2" />
                Reading History
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-purple-500">
                <Heart className="w-4 h-4 mr-2" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="subscription" className="data-[state=active]:bg-purple-500">
                <Crown className="w-4 h-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="points" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <Trophy className="w-4 h-4 mr-2" />
                Points & Rewards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {readingHistory.map((item, idx) => (
                <Link
                  key={`${item.chapter?.id || idx}`}
                  to={`/novel/${item.chapter?.novel?.slug}/chapter/${item.chapter?.id}`}
                  className="block"
                >
                  <div className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition-colors flex items-center gap-4">
                    <img
                      src={item.chapter?.novel?.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100'}
                      alt={item.chapter?.novel?.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{item.chapter?.novel?.title}</h3>
                      <p className="text-slate-400 text-sm mb-2">
                        Chapter {item.chapter?.orderIndex}: {item.chapter?.title}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Last read: {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              
              {readingHistory.length === 0 && (
                <p className="text-slate-400 text-center py-12">No reading history yet</p>
              )}
            </TabsContent>

            <TabsContent value="favorites">
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No favorites yet</p>
              </div>
            </TabsContent>

            <TabsContent value="subscription">
              <div className="bg-slate-800 rounded-lg p-8">
                {isPremium && !isExpired ? (
                  <div className="text-center">
                    <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Premium Active</h3>
                    <p className="text-slate-300 mb-6">
                      Your subscription expires on {new Date(profile.subscription.expiresAt).toLocaleDateString()}
                    </p>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">Upgrade to Premium</h3>
                    <p className="text-slate-300 mb-6">
                      Unlock all premium chapters and exclusive content
                    </p>
                    <Link to="/subscription">
                      <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                        View Plans
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="points">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500/20 rounded-full border border-amber-500/30">
                      <Coins className="w-10 h-10 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-amber-200">Current Balance</h2>
                      <p className="text-4xl font-bold text-white">{profile?.pointsBalance || 0} <span className="text-lg text-amber-400/70 font-normal">pts</span></p>
                    </div>
                  </div>
                  <div className="text-right bg-black/20 p-4 rounded-lg border border-white/5">
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-1">Exchange Rate</p>
                    <p className="text-xl font-bold text-white">10 Points = $1.00 USD</p>
                  </div>
                </div>

                <div>
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                     <Clock className="w-5 h-5 text-slate-400" /> Points History
                   </h3>
                   <PointsHistoryTable userId={user.id} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
