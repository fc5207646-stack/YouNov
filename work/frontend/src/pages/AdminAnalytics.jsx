
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Users, BookOpen, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [stats, setStats] = useState({
    totalViews: 0,
    totalUsers: 0,
    premiumUsers: 0,
    totalChapters: 0,
    topNovels: [],
    subscriptionDistribution: [],
    dailyActivity: []
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/admin/analytics?days=${encodeURIComponent(timeRange)}`);
      const s = data.stats || {};
      setStats({
        totalViews: s.totalViews || 0,
        totalUsers: s.totalUsers || 0,
        premiumUsers: s.premiumUsers || 0,
        totalChapters: s.totalChapters || 0,
        topNovels: s.topNovels || [],
        subscriptionDistribution: s.subscriptionDistribution || [],
        dailyActivity: (s.dailyActivity || []).map((x) => ({
          ...x,
          date: x?.date ? format(new Date(x.date), 'MMM dd') : ''
        }))
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Analytics</title></Helmet>
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Platform Analytics</h1>
            <p className="text-slate-400">Overview of system performance and user engagement</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Views" 
            value={stats.totalViews.toLocaleString()} 
            icon={BookOpen} 
            trend="+12%" 
            trendUp={true} 
            color="blue" 
          />
          <MetricCard 
            title="Total Users" 
            value={stats.totalUsers.toLocaleString()} 
            icon={Users} 
            trend="+5%" 
            trendUp={true} 
            color="purple" 
          />
          <MetricCard 
            title="Premium Subscribers" 
            value={stats.premiumUsers.toLocaleString()} 
            icon={DollarSign} 
            trend="+8%" 
            trendUp={true} 
            color="green" 
          />
          <MetricCard 
            title="Total Chapters" 
            value={stats.totalChapters.toLocaleString()} 
            icon={BookOpen} 
            trend="+24" 
            trendUp={true} 
            color="orange" 
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Growth Trends</CardTitle>
              <CardDescription className="text-slate-400">User activity over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="visits" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="registrations" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Top 10 Novels</CardTitle>
              <CardDescription className="text-slate-400">By total view count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topNovels} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" hide />
                    <YAxis dataKey="title" type="category" width={150} stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                       cursor={{fill: '#334155', opacity: 0.2}}
                       contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="views" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {stats.topNovels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="bg-slate-900 border-slate-800 shadow-lg lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white">User Distribution</CardTitle>
              <CardDescription className="text-slate-400">Subscription types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.subscriptionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.subscriptionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 shadow-lg lg:col-span-2">
             <CardHeader>
              <CardTitle className="text-white">Recent Subscription Trends</CardTitle>
              <CardDescription className="text-slate-400">Daily new subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                       cursor={{fill: '#334155', opacity: 0.2}}
                       contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="subscriptions" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </AdminLayout>
  );
};

const MetricCard = ({ title, value, icon: Icon, trend, trendUp, color }) => (
  <Card className="bg-slate-900 border-slate-800 shadow-lg hover:shadow-xl transition-shadow border-t-4" style={{ borderTopColor: `var(--${color}-500)` }}>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
        </div>
        <div className={`flex items-center text-sm font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trendUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default AdminAnalytics;
