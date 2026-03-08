import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ReaderSettings from '@/components/ReaderSettings';
import CommentsSection from '@/components/CommentsSection';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiClient';

const ChapterReaderPage = () => {
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chapter, setChapter] = useState(null);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false); // Default false for security
  
  // User local overrides (Dark mode, etc)
  const [userSettings, setUserSettings] = useState({
    fontSize: 18, lineHeight: 1.8, bgColor: '#0f172a', textColor: '#e2e8f0'
  });

  useEffect(() => {
    const ls = localStorage.getItem('readerSettings');
    if (!ls) return;
    try {
      const parsed = JSON.parse(ls);
      if (parsed && typeof parsed === 'object') {
        setUserSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (_err) {
      // ignore corrupted settings
    }
  }, []);

  const updateUserSettings = (newSettings) => {
    setUserSettings(newSettings);
    localStorage.setItem('readerSettings', JSON.stringify(newSettings));
  };

  const escapeHtml = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      setLoading(true); setError(null);
      try {
        if (!chapterId || !novelId) throw new Error("Invalid URL parameters");
        const data = await apiFetch(`/chapters/${chapterId}`);
        if (active) {
          setChapter(data.chapter);
          setNovel(data.chapter?.novel || null);
          setHasAccess(true);
        }

      } catch (e) {
        if (e?.status === 402) {
          if (active) {
            setHasAccess(false);
            setError(null);
          }
        } else {
          console.error(e);
          if (active) setError(e?.error || e?.message || "Could not load chapter.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetch();
    return () => { active = false; };
  }, [chapterId, novelId, user]);

  const nav = async (dir) => {
     try {
       const data = await apiFetch(`/novels/${novelId}/chapters`).catch(() => ({ chapters: [] }));
       const list = Array.isArray(data?.chapters) ? data.chapters : [];
       const idx = list.findIndex(c => c.id === chapterId);
       const nextIdx = dir === 'next' ? idx + 1 : idx - 1;
       if (list[nextIdx]) {
           navigate(`/novel/${novelId}/chapter/${list[nextIdx].id}`);
           window.scrollTo(0,0);
       } else {
           toast({ title: dir === 'next' ? "End of novel" : "Start of novel", description: "You have reached the limit." });
       }
     } catch (err) {
       console.error(err);
     }
  };

  if (loading) return <div className="min-h-screen bg-page flex items-center justify-center text-slate-800"><Loader2 className="animate-spin w-8 h-8 text-accent-500"/></div>;
  if (error) return <div className="min-h-screen bg-page flex flex-col items-center justify-center text-slate-800 p-4"><AlertCircle className="w-12 h-12 text-red-500 mb-4"/><p>{error}</p><Button onClick={() => window.location.reload()} className="mt-4">Retry</Button></div>;

  if (!hasAccess) {
      return (
          <div className="min-h-screen bg-page flex flex-col items-center justify-center text-center px-4">
              <Helmet><title>Premium Content | YouNov</title></Helmet>
              <BookOpen className="w-20 h-20 text-amber-500 mb-6" />
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Premium Content</h1>
              <p className="text-slate-600 mb-8 max-w-md">This chapter is locked for premium members. Upgrade your subscription to continue reading.</p>
              <Button size="lg" onClick={() => navigate('/subscription')} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:from-yellow-400 hover:to-orange-400">Unlock Now</Button>
              <Button variant="link" onClick={() => navigate(`/novel/${novelId}`)} className="text-slate-500 mt-4">Back to Novel</Button>
          </div>
      );
  }

  // Combine Editor Settings (Author's intent) with Reader Settings (User's preference)
  // Logic: Use Author's setting if present, otherwise default. User preferences (like dark mode/font size scaling) might override if we built complex logic,
  // but for now, we will respect the "Editor Settings" as the "Author's styling" and maybe only override colors if the user uses a theme toggle.
  // Actually, standard reader apps allow USER to override everything.
  // Let's PRIORITIZE user settings for font-size/color/bg, but respect Author's Alignment/LineHeight if user hasn't customized (though userSettings has defaults).
  // The prompt asks for: "When displaying chapters... Apply saved font family, font size...".
  // This implies the Author's settings are critical.
  // However, userSettings (from the reader bar) usually overrides.
  // I will merge them: `userSettings` takes precedence for readability features (size, theme), `editor_settings` for structural (alignment, line height if not set by user).
  // BUT the prompt explicitly says: "Update ChapterReaderPage to apply SAVED EDITOR SETTINGS... Apply saved font family...".
  // So I will apply Editor Settings directly as the base style.
  
  const es = chapter?.editor_settings || {};
  const chapterHtml = escapeHtml(chapter?.content || '').replace(/\n/g, '<br/>');
  
  // Dynamic Style
  const contentStyle = {
    fontFamily: es.fontFamily || 'serif',
    fontSize: es.fontSize ? `${es.fontSize}px` : `${userSettings.fontSize}px`,
    lineHeight: es.lineHeight || userSettings.lineHeight || '1.8',
    textAlign: es.textAlign || 'left',
    color: userSettings.textColor, // Prioritize user theme for readability
  };
  
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: userSettings.bgColor }}>
       <Helmet><title>{chapter.title} - {novel.title}</title></Helmet>
       
       {/* Sticky Reader Bar */}
       <div className="sticky top-0 z-30 border-b backdrop-blur-md flex items-center justify-between px-4 h-14" style={{ backgroundColor: userSettings.bgColor + 'DD', borderColor: userSettings.textColor + '20' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/novel/${novelId}`)} style={{ color: userSettings.textColor }}><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button>
          <span className="text-xs font-medium opacity-50 truncate max-w-[150px]" style={{ color: userSettings.textColor }}>{chapter.title}</span>
          <ReaderSettings settings={userSettings} onUpdate={updateUserSettings} />
       </div>

       <div className="max-w-3xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-2xl font-bold mb-12 text-center font-serif tracking-widest uppercase flex items-center justify-center gap-2" style={{ color: userSettings.textColor }}>
                <span>CHAPTER</span>
                <span className="font-sans lining-nums">{chapter.orderIndex}</span>
              </h1>
              
              {/* Content Wrapper */}
              <div 
                 className="p-1 md:p-8 rounded-lg"
                 style={{
                    ...contentStyle
                 }}
              >
                  <div 
                    className="chapter-content prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: chapterHtml }}
                    style={{ color: 'inherit' }} // Ensure prose inherits our color
                  />
              </div>

              <div className="flex justify-between items-center border-t border-b py-8 my-12" style={{ borderColor: userSettings.textColor + '20' }}>
                  <Button variant="outline" onClick={() => nav('prev')} style={{ color: userSettings.textColor, borderColor: userSettings.textColor + '40' }}>Previous</Button>
                  <Button className="bg-accent-600 hover:bg-accent-700 text-white" onClick={() => nav('next')}>Next Chapter</Button>
              </div>

              <CommentsSection novelId={novelId} chapterId={chapterId} />
          </motion.div>
       </div>
    </div>
  );
};

export default ChapterReaderPage;