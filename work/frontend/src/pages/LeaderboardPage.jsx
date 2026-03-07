
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Star, Eye } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

const LeaderboardPage = () => {
  const [mostRead, setMostRead] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiFetch('/leaderboard');
        setMostRead(Array.isArray(data?.mostRead) ? data.mostRead : []);
        setTopRated(Array.isArray(data?.topRated) ? data.topRated : []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const RankItem = ({ novel, index, metric, icon: Icon }) => (
    <Link to={`/novel/${novel.slug}`} className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors mb-4 group">
      <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg rounded-full ${index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : 'text-slate-500 bg-slate-800'}`}>
        {index + 1}
      </div>
      <img src={novel.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300'} alt={novel.title} className="w-12 h-16 object-cover rounded shadow-md" />
      <div className="flex-1">
        <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">{novel.title}</h3>
        <p className="text-sm text-slate-400">{novel.authorName}</p>
      </div>
      <div className="flex items-center gap-2 text-slate-300">
        <Icon className="w-4 h-4 text-purple-500" />
        <span className="font-mono font-bold">{metric}</span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <Helmet>
        <title>YouNov - Leaderboard | 尤诺夫·小说阅读平台</title>
        <meta name="description" content="Discover the most popular and highest-rated novels on YouNov. See what readers are loving right now." />
      </Helmet>
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" /> Leaderboard
          </h1>
          <p className="text-slate-400">The most popular novels on YouNov</p>
        </div>

        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-8">
            <TabsTrigger value="views" className="data-[state=active]:bg-purple-600">Most Read</TabsTrigger>
            <TabsTrigger value="rating" className="data-[state=active]:bg-purple-600">Top Rated</TabsTrigger>
          </TabsList>
          
          <TabsContent value="views">
            {loading ? <div className="text-center py-10">Loading...</div> : (
              (Array.isArray(mostRead) ? mostRead : []).map((novel, idx) => (
                <RankItem key={novel.id} novel={novel} index={idx} metric={(novel.views ?? 0).toLocaleString()} icon={Eye} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="rating">
             {loading ? <div className="text-center py-10">Loading...</div> : (
              (Array.isArray(topRated) ? topRated : []).map((novel, idx) => (
                <RankItem key={novel.id} novel={novel} index={idx} metric={novel.ratingCount ? `${(novel.rating ?? 0).toFixed(1)} (${novel.ratingCount})` : 'N/A'} icon={Star} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeaderboardPage;
