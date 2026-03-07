
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, User, LogOut, Settings, Search, Bell, Menu, ShieldCheck, Compass, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { safeMap } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const { user, signOut, isAdmin } = useAuth(); 
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Notifications: load from backend (global announcements)
    const load = async () => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      try {
        const data = await apiFetch('/notifications');
        setNotifications(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unreadCount || 0));
      } catch (e) {
        console.error('notifications load error', e);
        setNotifications([]);
        setUnreadCount(0);
      }
    };
    load();
  }, [user]);

  const handleSearch = async (value) => {
    setSearchTerm(value);
    if (value.length > 1) {
      try {
        const qs = new URLSearchParams({ q: value, take: '5', skip: '0' });
        const data = await apiFetch(`/novels?${qs.toString()}`);
        setSearchResults(Array.isArray(data?.items) ? data.items : []);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <BookOpen className="w-8 h-8 text-purple-500" />
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hidden md:block">
            YouNov
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10 ml-6 lg:ml-8">
          <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            Home
          </Link>
          <Link to="/browse" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            Library
          </Link>
          <Link to="/free" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            Free
          </Link>
          <Link to="/leaderboard" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            <Trophy className="w-4 h-4" /> Ranking
          </Link>
          <Link to="/promotion" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            <Sparkles className="w-4 h-4" /> Promotion
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="relative hidden md:block group ml-auto shrink-0 w-64 lg:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search novels..." 
              className="pl-10 bg-slate-900/50 border-slate-700 focus:bg-slate-900 transition-all text-white placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm.length > 1 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && (Array.isArray(searchResults) ? searchResults : []).length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
              {safeMap(searchResults, (novel) => (
                <Link 
                  key={novel.id} 
                  to={`/novel/${novel.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors"
                >
                  <img
                    src={novel.coverUrl || 'https://via.placeholder.com/40'}
                    alt={novel.title}
                    className="w-8 h-12 object-cover rounded"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-white">{novel.title}</h4>
                    <p className="text-xs text-slate-400">{novel.authorName}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Admin Dashboard Button - Only visible to Admins */}
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/admin')}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20" 
                  title="Admin Dashboard"
                >
                  <ShieldCheck className="w-5 h-5" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-slate-700 text-white">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  {(Array.isArray(notifications) ? notifications : []).length > 0 ? (
                    safeMap(notifications, (notif) => (
                      <DropdownMenuItem key={notif.id} className="p-3 focus:bg-slate-800">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{notif.title}</span>
                          <span className="text-xs text-slate-400">{notif.message}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No new notifications
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full bg-slate-800 border border-slate-700">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 min-w-[200px] text-white">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">{user.email || user.phone}</p>
                      {isAdmin && <span className="text-[10px] bg-purple-600 px-1.5 py-0.5 rounded w-fit">ADMIN</span>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="focus:bg-slate-800 cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="focus:bg-slate-800 cursor-pointer text-red-400 hover:text-red-300">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex border-slate-600 text-white bg-slate-900/40 hover:bg-slate-800 hover:border-slate-500"
              >
                Login
              </Button>
              <Button onClick={() => navigate('/register')} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
                Register
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-900 border-slate-800 w-full max-w-xs">
                <div className="flex flex-col gap-6 mt-8">
                   <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search..." 
                      className="pl-10 bg-slate-800 border-slate-700 text-white"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                  <nav className="flex flex-col gap-4">
                    <Link to="/" className="text-lg font-medium text-slate-300 hover:text-white flex items-center gap-3">
                      <Compass className="w-5 h-5" /> Home
                    </Link>
                    <Link to="/browse" className="text-lg font-medium text-slate-300 hover:text-white flex items-center gap-3">
                      <BookOpen className="w-5 h-5" /> Library
                    </Link>
                    <Link to="/free" className="text-lg font-medium text-slate-300 hover:text-white flex items-center gap-3">
                      <TrendingUp className="w-5 h-5" /> Free
                    </Link>
                    <Link to="/leaderboard" className="text-lg font-medium text-slate-300 hover:text-white flex items-center gap-3">
                      <Trophy className="w-5 h-5" /> Ranking
                    </Link>
                    <Link to="/promotion" className="text-lg font-medium text-slate-300 hover:text-white flex items-center gap-3">
                      <Sparkles className="w-5 h-5" /> Promotion
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="text-lg font-medium text-purple-400 hover:text-purple-300 flex items-center gap-3 border-t border-slate-800 pt-4 mt-2">
                        <ShieldCheck className="w-5 h-5" /> Admin Dashboard
                      </Link>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
