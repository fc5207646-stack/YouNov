import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { BookOpen, Users, ShieldCheck, Bell, MessageSquare, BarChart3, Settings, ShieldCheck as ShieldCheck2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/admin/analytics?days=30');
        if (active) setStats(data.stats || null);
      } catch (e) {
        console.error(e);
        if (active) setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, []);

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Admin</title></Helmet>

      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">管理后台</h1>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm">总访问（views）</div>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-purple-500" /> : (stats?.totalViews ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm">用户数</div>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-purple-500" /> : (stats?.totalUsers ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm">活跃订阅</div>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-purple-500" /> : (stats?.premiumUsers ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm">章节数</div>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-purple-500" /> : (stats?.totalChapters ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/admin/novels" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">小说管理</span>
            </div>
            <p className="text-slate-400 text-sm">创建/编辑小说，进入章节管理</p>
          </Link>

          <Link to="/admin/users" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">用户管理</span>
            </div>
            <p className="text-slate-400 text-sm">角色/封禁/积分调整</p>
          </Link>

          <Link to="/admin/comments" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">评论审核</span>
            </div>
            <p className="text-slate-400 text-sm">查看与删除用户评论</p>
          </Link>

          <Link to="/admin/notifications" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">通知管理</span>
            </div>
            <p className="text-slate-400 text-sm">发布/已读/删除</p>
          </Link>

          <Link to="/admin/analytics" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">数据分析</span>
            </div>
            <p className="text-slate-400 text-sm">趋势/Top/分布</p>
          </Link>

          <Link to="/admin/settings" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">系统设置</span>
            </div>
            <p className="text-slate-400 text-sm">SEO/通用/备份</p>
          </Link>

          <Link to="/admin/whitelist" className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/40 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck2 className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">IP 白名单</span>
            </div>
            <p className="text-slate-400 text-sm">管理可访问 IP</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

