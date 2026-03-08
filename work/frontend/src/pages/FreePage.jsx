import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';
import { parseTags, safeMap } from '@/lib/utils';
import { NOVEL_CATEGORIES } from '@/lib/categories';

const FreePage = () => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNovels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm]);

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (searchTerm) qs.set('q', searchTerm);
      if (selectedCategory && selectedCategory !== 'All') qs.set('tag', selectedCategory);
      qs.set('take', '48');
      qs.set('skip', '0');
      const data = await apiFetch(`/free-novels?${qs.toString()}`);
      setNovels(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setNovels([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-page">
      <Helmet>
        <title>YouNov - Free | 尤诺夫·小说阅读平台</title>
        <meta name="description" content="Browse free-to-read novels on YouNov." />
      </Helmet>
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters (kept same layout as Browse) */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent-500" /> Category
              </h3>
              <p className="text-xs text-slate-500 mb-4">Filter by keyword tags from novel detail page</p>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === 'All' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('All')}
                >
                  All Categories
                </Button>
                {NOVEL_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search free novels..."
                className="pl-10 h-12 bg-white border-slate-200 text-slate-800 text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-64 bg-stone-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {safeMap(novels, (novel, idx) => (
                  <motion.div
                    key={novel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={`/novel/${novel.slug}`}
                      className="group block h-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:border-accent-400 hover:shadow-md transition-all hover:shadow-2xl hover:shadow-accent-900/10"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden">
                        <img
                          src={novel.coverUrl || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600'}
                          alt={novel.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Badge className="bg-green-600/20 text-green-300 border border-green-500/20">FREE</Badge>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <span className="text-white text-sm font-medium flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Read Now
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-800 mb-1 truncate">{novel.title}</h3>
                        <p className="text-sm text-slate-600 truncate">{novel.authorName}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {parseTags(novel.tags).slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="border-slate-200 text-xs text-slate-500">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && novels.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-xl">No free novels found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreePage;

