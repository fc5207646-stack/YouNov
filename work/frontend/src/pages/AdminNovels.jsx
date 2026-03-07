import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/apiClient';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const AdminNovels = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novels, setNovels] = useState([]);

  const [form, setForm] = useState({
    title: '',
    authorName: '',
    slug: '',
    coverUrl: '',
    description: '',
    tags: '',
    isPublished: true
  });

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/novels');
      setNovels(data.items || []);
    } catch (e) {
      toast({ variant: 'destructive', title: '加载失败', description: e?.error || '无法获取小说列表' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return novels;
    return novels.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.authorName || '').toLowerCase().includes(q) || (n.slug || '').toLowerCase().includes(q));
  }, [novels, searchTerm]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.authorName.trim() || !form.description.trim()) {
      toast({ variant: 'destructive', title: '校验失败', description: '标题/作者/简介不能为空' });
      return;
    }
    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) {
      toast({ variant: 'destructive', title: '校验失败', description: 'slug 不能为空' });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/admin/novels', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          authorName: form.authorName.trim(),
          slug,
          description: form.description.trim(),
          coverUrl: form.coverUrl.trim() || null,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          isPublished: Boolean(form.isPublished)
        }
      });
      toast({ title: '创建成功', description: '小说已创建', className: 'bg-green-600 text-white border-none' });
      setDialogOpen(false);
      setForm({ title: '', authorName: '', slug: '', coverUrl: '', description: '', tags: '', isPublished: true });
      await fetchNovels();
    } catch (e2) {
      toast({ variant: 'destructive', title: '创建失败', description: e2?.error || '请检查 slug 是否已存在' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Admin Novels</title></Helmet>

      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">小说管理</h1>
            <p className="text-slate-400">管理小说与章节（基于自建 API）</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索标题/作者/slug"
                className="pl-10 bg-slate-900 border-slate-800 text-white h-11 rounded-full"
              />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新建小说
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-xl">
                <DialogHeader>
                  <DialogTitle>创建小说</DialogTitle>
                </DialogHeader>
                <form onSubmit={onCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>标题</Label>
                      <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value, slug: p.slug || slugify(e.target.value) }))} className="bg-slate-900 border-slate-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>作者</Label>
                      <Input value={form.authorName} onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))} className="bg-slate-900 border-slate-800" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Slug（URL 标识）</Label>
                    <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="bg-slate-900 border-slate-800 font-mono" />
                  </div>

                  <div className="space-y-2">
                    <Label>封面 URL（可选）</Label>
                    <Input value={form.coverUrl} onChange={(e) => setForm((p) => ({ ...p, coverUrl: e.target.value }))} className="bg-slate-900 border-slate-800" />
                  </div>

                  <div className="space-y-2">
                    <Label>简介</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="bg-slate-900 border-slate-800 min-h-[120px]" />
                  </div>

                  <div className="space-y-2">
                    <Label>标签（逗号分隔）</Label>
                    <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="bg-slate-900 border-slate-800" placeholder="商业,逆袭,职场" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="text-sm text-slate-300 flex items-center gap-2">
                      <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                      发布（可被前台检索）
                    </label>
                    <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">标题</th>
                  <th className="px-6 py-4">作者</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">加载中...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">暂无数据</td></tr>
                ) : (
                  filtered.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 text-white font-medium">{n.title}</td>
                      <td className="px-6 py-4">{n.authorName}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{n.slug}</td>
                      <td className="px-6 py-4">
                        {n.isPublished ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-700 text-slate-400">Draft</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link to={`/admin/novels/${n.slug}`} className="text-purple-400 hover:text-purple-300">详情</Link>
                          <Link to={`/admin/novels/${n.slug}/chapters`} className="text-slate-300 hover:text-white">章节</Link>
                          <Link to={`/novel/${n.slug}`} className="text-slate-500 hover:text-slate-300">前台</Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNovels;

