import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { BookOpen, Eye, ChevronRight, FileText, Lock, Clock, BookmarkPlus, Loader2, AlertCircle, RefreshCw, Unlock, Star, Type, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/apiClient';
import { parseTags, safeMap } from '@/lib/utils';

const NovelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [isBookshelf, setIsBookshelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingRead, setStartingRead] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [myRating, setMyRating] = useState(null);
  const retried404Ref = useRef(false);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    retried404Ref.current = false;
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Parallel fetch for speed
        const [novelData, chaptersData] = await Promise.all([
          apiFetch(`/novels/${id}`),
          apiFetch(`/novels/${id}/chapters`).catch((e) => ({ chapters: [] }))
        ]);

        const novelObj = novelData?.novel;
        if (!novelObj) {
          setError("Not found");
          setNovel(null);
          setChapters(Array.isArray(chaptersData?.chapters) ? chaptersData.chapters : []);
          return;
        }

        setNovel(novelObj);
        const rawChapters = chaptersData?.chapters;
        setChapters(Array.isArray(rawChapters) ? rawChapters : []);

        if (user) {
          // Parallel fetch for user data
          const [sub, shelf] = await Promise.all([
            apiFetch('/subscriptions/me').catch(() => ({ subscription: null })),
            apiFetch(`/bookshelf/${encodeURIComponent(id)}`).catch(() => ({ inBookshelf: false }))
          ]);
          
          setSubscriptionStatus(sub?.subscription ? 'active' : null);
          setIsBookshelf(Boolean(shelf?.inBookshelf));
        } else {
          setSubscriptionStatus(null);
          setIsBookshelf(false);
        }
      } catch (err) {
        console.error(err);
        const status = err?.status;
        // 404 时自动重试一次（应对 Nginx 轮询到暂无该书的 API 节点）
        if (status === 404 && !retried404Ref.current) {
          retried404Ref.current = true;
          setLoading(false);
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            fetchData();
          }, 400);
          return;
        }
        setChapters(prev => (Array.isArray(prev) ? prev : []));
        const isNoResponse = status === 0 || status === undefined;
        const isNetwork = err?.error === "network_error" || err?.message?.includes?.("fetch") || err?.message?.includes?.("Network");
        const msg = status === 404
          ? "小说不存在或已被下架"
          : status >= 500
            ? "服务器暂时出错，请稍后重试"
            : status === 408 || err?.error === "timeout"
              ? "请求超时，请稍后重试"
              : isNetwork || isNoResponse
                ? "无法连接服务器，请检查网络或稍后重试"
                : "Failed to load novel.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleStartReading = () => {
    const list = Array.isArray(chapters) ? chapters : [];
    if (list.length === 0) return toast({ variant: "destructive", title: "Empty", description: "No chapters available." });
    setStartingRead(true);
    navigate(`/novel/${id}/chapter/${list[0].id}`);
  };

  const handleAddToShelf = async () => {
    if (!user) return navigate('/login');
    try {
      if (isBookshelf) {
        await apiFetch(`/bookshelf/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setIsBookshelf(false);
        toast({ title: "Removed from library" });
      } else {
        await apiFetch(`/bookshelf/${encodeURIComponent(id)}`, { method: 'POST' });
        setIsBookshelf(true);
        toast({ title: "Added to library", className: "bg-green-600 text-white" });
      }
    } catch (e) { toast({ variant: "destructive", title: "Error", description: "Operation failed." }); }
  };

  const rate = async (value) => {
    if (!user) return navigate('/login');
    setRatingSubmitting(true);
    try {
      const data = await apiFetch(`/novels/${encodeURIComponent(id)}/rate`, { method: 'POST', body: { rating: value } });
      setMyRating(value);
      setNovel((prev) => (prev ? { ...prev, rating: data.novel.rating, ratingCount: data.novel.ratingCount } : prev));
      toast({ title: '评分成功', description: `你给出了 ${value} 星` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: '评分失败', description: e?.error || '请稍后重试' });
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-page pt-20 px-4 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-accent-500"/></div>;
  if (error || !novel) return <div className="min-h-screen bg-page pt-20 px-4 text-center text-slate-800"><AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-2"/>{error || "Not found"}</div>;

  const tagsArray = parseTags(novel.tags);
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const tagsToShow = Array.isArray(tagsArray) ? tagsArray.slice(0, 3) : [];

  // Calculate total word count from chapters if novel.wordCount is not available
  const totalWordCount = (typeof novel.wordCount === 'number' ? novel.wordCount : 0) 
    || safeChapters.reduce((acc, c) => acc + (c.wordCount || 0), 0);
  
  const wordCountDisplay = totalWordCount > 10000 
    ? `${(totalWordCount / 10000).toFixed(1)}万字`
    : `${totalWordCount}字`;

  return (
    <div className="min-h-screen bg-page pb-20 font-sans">
      <Helmet><title>{novel.title}</title></Helmet>
      <Header />

      <div className="relative w-full bg-gradient-to-b from-stone-100 to-page pb-12 pt-24 px-4 overflow-hidden border-b border-slate-200">
         <div className="absolute inset-0 opacity-30">
           <img src={novel.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200'} className="w-full h-full object-cover blur-3xl scale-125" alt="" />
         </div>
         <div className="container mx-auto relative z-10 flex flex-col md:flex-row gap-8">
            <div className="w-48 h-64 mx-auto md:mx-0 shrink-0 shadow-xl rounded-xl overflow-hidden border border-slate-200 bg-white">
               <img src={novel.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600'} className="w-full h-full object-cover" alt={novel.title} />
            </div>
            <div className="flex-1 text-center md:text-left">
               <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <Badge variant={novel.status === 'COMPLETED' ? "default" : "outline"} className={novel.status === 'COMPLETED' ? "bg-green-600 hover:bg-green-700 border-none" : "border-accent-500 text-accent-400"}>
                    {novel.status === 'COMPLETED' ? '已完结' : '连载中'}
                  </Badge>
                  {safeMap(tagsToShow, (t) => (
                    <Badge key={t} variant="outline" className="border-slate-200 text-slate-600 bg-white/80">{t}</Badge>
                  ))}
               </div>
               <h1 className="text-4xl font-extrabold text-slate-800 mb-4">{novel.title}</h1>
               <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-slate-600 mb-6">
                  <span className="text-slate-800 font-medium">{novel.authorName}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Updated {new Date(novel.updatedAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {(novel.ratingCount ? novel.rating.toFixed(1) : 'N/A')} {novel.ratingCount ? <span className="text-slate-500">({novel.ratingCount})</span> : null}
                  </span>
                  
                  {/* High visibility word count badge - using raw HTML styles to avoid component issues */}
                  <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold" title="Total Word Count">
                     <FileText className="w-3 h-3" />
                     <span>{wordCountDisplay}</span>
                  </div>
               </div>
               <div className="flex justify-center md:justify-start gap-4 mb-8">
                  <Button onClick={handleStartReading} size="lg" className="rounded-full px-8 bg-accent-600 hover:bg-accent-700 shadow-lg shadow-accent-900/30">
                     {startingRead ? <Loader2 className="animate-spin" /> : 'Start Reading'}
                  </Button>
                  <Button onClick={handleAddToShelf} size="lg" variant="outline" className={`rounded-full px-8 ${isBookshelf ? 'bg-accent-900/20 border-accent-500 text-accent-400' : ''}`}>
                     {isBookshelf ? <><Check className="mr-2 h-4 w-4" /> In Library</> : <><BookmarkPlus className="mr-2 h-4 w-4" /> Add to Library</>}
                  </Button>
               </div>
               <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                 {[1, 2, 3, 4, 5].map((v) => (
                   <button
                     key={v}
                     disabled={ratingSubmitting}
                     onClick={() => rate(v)}
                     className={`px-3 py-1 rounded-full text-sm border transition ${
                       (myRating || 0) >= v ? 'bg-amber-100 border-amber-400/50 text-amber-800' : 'bg-stone-100 border-slate-200 text-slate-600 hover:border-amber-400/50'
                     }`}
                     title="点击评分"
                   >
                     {v}★
                   </button>
                 ))}
               </div>
               <p className="text-slate-600 leading-relaxed max-w-3xl">{novel.description}</p>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-4 mt-12 max-w-5xl">
         <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
            <BookOpen className="text-accent-500"/> Chapters <span className="text-sm font-normal text-slate-500 ml-auto">{safeChapters.length} total</span>
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {safeMap(safeChapters, (c) => (
               <Link key={c.id} to={`/novel/${id}/chapter/${c.id}`} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-stone-50 hover:border-accent-400/50 transition-all group shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <span className="text-slate-500 text-xs w-8">#{c.orderIndex}</span>
                     <span className="text-slate-700 font-medium truncate group-hover:text-accent-600">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                     {c.isFree ? (
                       <span className="text-[10px] bg-green-100 px-1.5 rounded text-green-700">FREE</span>
                     ) : subscriptionStatus ? (
                       <Unlock className="w-4 h-4 text-green-500" />
                     ) : (
                       <Lock className="w-4 h-4 text-yellow-500" />
                     )}
                  </div>
               </Link>
            ))}
         </div>
      </div>
    </div>
  );
};

export default NovelDetailPage;