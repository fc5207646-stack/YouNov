
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';
import AppDownloadButtons from '@/components/AppDownloadButtons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, Eye, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

// Default cover when URL is missing or fails to load (same as Browse/Free pages)
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600';

const OptimizedImage = ({ src, alt, className, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const effectiveSrc = (src && !error) ? src : DEFAULT_COVER;

  return (
    <div className={`relative overflow-hidden bg-stone-200 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-stone-100 animate-pulse z-10" />
      )}
      <img
        src={effectiveSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

const HomePage = () => {
  // Force update v6
  const { user } = useAuth();
  const [featuredNovels, setFeaturedNovels] = useState([]);
  const [trendingNovels, setTrendingNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeLeaderboard = (data) => {
    if (!data || typeof data !== 'object') return null;
    const mostRead = Array.isArray(data.mostRead) ? data.mostRead : null;
    const topRated = Array.isArray(data.topRated) ? data.topRated : null;
    if (!mostRead || !topRated) return null;
    return { mostRead, topRated };
  };

  const fetchNovels = async () => {
    setLoading(true);
    setError(null);
    let loaded = false;
    try {
      const lb = await apiFetch('/leaderboard');
      const normalized = normalizeLeaderboard(lb);
      if (normalized && (normalized.mostRead.length > 0 || normalized.topRated.length > 0)) {
        setTrendingNovels(normalized.mostRead.slice(0, 12));
        setFeaturedNovels(normalized.topRated.slice(0, 6));
        loaded = true;
      }
    } catch (err) {
      console.error("Home load error:", err);
    }

    if (!loaded) {
      try {
        const fallback = await apiFetch('/novels?take=18&skip=0');
        const items = Array.isArray(fallback?.items) ? fallback.items : [];
        if (items.length > 0) {
          setTrendingNovels(items.slice(6, 18));
          setFeaturedNovels(items.slice(0, 6));
          loaded = true;
        }
      } catch (err) {
        console.error("Home fallback error:", err);
      }
      if (!loaded) setError("Failed to load content. Please check your network or try again later.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNovels();
    const retryTimer = setTimeout(fetchNovels, 2200);
    return () => clearTimeout(retryTimer);
  }, [user]);

  return (
    <div className="min-h-screen bg-page relative">
      <Helmet><title>YouNov - Home</title></Helmet>
      <Header />

      <section className="relative pt-32 pb-24 md:pt-36 md:pb-28 px-4 overflow-hidden border-b border-slate-200 bg-gradient-to-b from-amber-50/60 to-transparent">
        <div className="container mx-auto relative z-10 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-5xl md:text-7xl font-bold leading-[1.14] md:leading-[1.10] pb-2 mb-8 text-slate-800">
                  Stories That Ignite
                </h1>
                <p className="text-lg md:text-xl leading-snug text-slate-600 mt-1 mb-8">
                  Dive into endless possibilities.
                </p>
                <div className="flex justify-center gap-4">
                    <Link to="/browse"><Button size="lg" className="bg-accent-600 hover:bg-accent-700 h-14 px-8 text-lg rounded-full shadow-lg shadow-accent-900/25">Start Reading</Button></Link>
                    <Link to="/subscription"><Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full">Get Premium</Button></Link>
                </div>
            </motion.div>
        </div>
      </section>

      {error && (
        <div className="text-center py-10 flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <span className="text-red-600">{error}</span>
            <Button onClick={fetchNovels} variant="outline" className="mt-4">Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <>
            {/* Featured */}
            <section className="py-16 px-4 bg-page-muted/50">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-8"><h2 className="text-3xl font-bold text-slate-800 flex gap-2"><Star className="text-amber-500" /> Featured</h2><Link to="/browse" className="text-accent-400 hover:text-accent-300 transition-colors">More</Link></div>
                    {(Array.isArray(featuredNovels) && featuredNovels.length > 0) ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                        {featuredNovels.map((novel, i) => (
                            <motion.div key={novel.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.1}}>
                                <Link to={`/novel/${novel.slug}`} className="group block">
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative bg-white border border-slate-200 shadow-sm group-hover:border-accent-400 group-hover:shadow-md transition-all">
                                        <OptimizedImage 
                                          src={novel.coverUrl} 
                                          alt={novel.title} 
                                          className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                                          priority={true}
                                        />
                                        <div className="absolute top-2 right-2 z-20">
                                            <Badge className="bg-yellow-500/90 text-black font-bold text-xs px-1.5 py-0.5 shadow-sm">#{i + 1}</Badge>
                                        </div>
                                    </div>
                                    <h3 className="text-slate-800 font-medium truncate group-hover:text-accent-600 text-center text-sm">{novel.title}</h3>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-12 text-slate-600">
                      <p className="mb-2">No featured content yet. Content will show here once novels are added.</p>
                      <div className="flex justify-center gap-3 mt-4">
                        <Button variant="outline" onClick={fetchNovels}>Retry</Button>
                        <Link to="/browse"><Button variant="outline">Browse All</Button></Link>
                      </div>
                    </div>
                    )}
                </div>
            </section>

            {/* Trending */}
            <section className="py-16 px-4">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-8"><h2 className="text-3xl font-bold text-slate-800 flex gap-2"><TrendingUp className="text-rose-500" /> Trending</h2><Link to="/browse" className="text-accent-400 hover:text-accent-300 transition-colors">More</Link></div>
                    {(Array.isArray(trendingNovels) && trendingNovels.length > 0) ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                        {trendingNovels.map((novel, i) => (
                            <Link key={novel.id} to={`/novel/${novel.slug}`} className="group">
                                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative bg-white border border-slate-200 shadow-sm">
                                    <OptimizedImage 
                                      src={novel.coverUrl} 
                                      alt={novel.title} 
                                      className="w-full h-full group-hover:scale-110 transition-transform"
                                      priority={i < 6}
                                    />
                                </div>
                                <h3 className="text-slate-800 font-medium truncate group-hover:text-accent-600 text-center text-sm">{novel.title}</h3>
                            </Link>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-12 text-slate-600">
                      <p className="mb-2">No trending content yet. Content will show here once novels are added.</p>
                      <div className="flex justify-center gap-3 mt-4">
                        <Button variant="outline" onClick={fetchNovels}>Retry</Button>
                        <Link to="/browse"><Button variant="outline">Browse All</Button></Link>
                      </div>
                    </div>
                    )}
                </div>
            </section>
        </>
      )}

      <AppDownloadButtons />
    </div>
  );
};

export default HomePage;
