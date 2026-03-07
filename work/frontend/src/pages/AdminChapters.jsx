import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/apiClient';
import { Loader2, Plus, Save, Trash2, Edit } from 'lucide-react';

const AdminChapters = () => {
  const { novelId } = useParams(); // 这里约定为 slug

  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const [createForm, setCreateForm] = useState({
    orderIndex: 1,
    title: '',
    content: '',
    isFree: false,
    isPublished: true
  });

  const [editingChapter, setEditingChapter] = useState(null);

  useEffect(() => {
    if (editingChapter) {
      setLoading(true);
      apiFetch(`/admin/chapters/${encodeURIComponent(editingChapter.id)}`)
        .then((data) => {
          if (data && data.chapter && data.chapter.content) {
            setCreateForm((prev) => ({ ...prev, content: data.chapter.content }));
          }
        })
        .catch((e) => {
          console.error("Failed to load chapter content", e);
          toast({ variant: 'destructive', title: '加载内容失败', description: '无法获取章节内容' });
        })
        .finally(() => setLoading(false));
    }
  }, [editingChapter]);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/admin/novels/${encodeURIComponent(novelId)}/chapters`);
      if (data && Array.isArray(data.chapters)) {
        setChapters(data.chapters);
      } else {
        setChapters([]);
      }
    } catch (e) {
      const msg = typeof e?.error === 'string' ? e.error : (typeof e?.message === 'string' ? e.message : '无法获取章节列表');
      toast({ variant: 'destructive', title: '加载失败', description: msg });
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => String(c.orderIndex).includes(q) || (c.title || '').toLowerCase().includes(q));
  }, [chapters, search]);

  const onSaveChapter = async (e) => {
    e.preventDefault();
    if (!createForm.content.trim()) {
      toast({ variant: 'destructive', title: '校验失败', description: '内容不能为空' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        content: createForm.content.trim(),
        isFree: Boolean(createForm.isFree),
        isPublished: Boolean(createForm.isPublished)
      };
      
      if (createForm.orderIndex) {
        payload.orderIndex = Number(createForm.orderIndex);
      }

      if (editingChapter) {
        await apiFetch(`/admin/chapters/${encodeURIComponent(editingChapter.id)}`, {
          method: 'PATCH',
          body: payload
        });
        toast({ title: '保存成功', description: '章节已更新' });
      } else {
        await apiFetch(`/admin/novels/${encodeURIComponent(novelId)}/chapters`, {
          method: 'POST',
          body: payload
        });
        toast({ title: '创建成功', description: '章节已创建', className: 'bg-green-600 text-white border-none' });
      }
      
      setDialogOpen(false);
      setCreateForm({ orderIndex: '', title: '', content: '', isFree: false, isPublished: true });
      setEditingChapter(null);
      await fetchChapters();
    } catch (e2) {
      console.error('Save chapter error details:', e2);
      let errorMsg = '请检查输入';
      try {
         if (e2?.details?.fieldErrors) {
           errorMsg = Object.entries(e2.details.fieldErrors).map(([k, v]) => `${k}: ${v}`).join('; ');
         } else if (typeof e2?.error === 'string') {
           errorMsg = e2.error;
         } else if (typeof e2?.message === 'string') {
           errorMsg = e2.message;
         } else if (e2 && typeof e2 === 'object') {
            errorMsg = JSON.stringify(e2.error || e2.message || e2);
         }
      } catch (parseErr) {
         console.error("Error parsing chapter error:", parseErr);
         errorMsg = "操作失败，无法解析错误信息";
      }
      toast({ variant: 'destructive', title: editingChapter ? '保存失败' : '创建失败', description: String(errorMsg) });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingChapter(null);
    // Calculate next order index
    const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => Number(c.orderIndex) || 0)) : 0;
    const nextOrder = maxOrder + 1;

    setCreateForm({ orderIndex: nextOrder, title: '', content: '', isFree: false, isPublished: true });
    setDialogOpen(true);
  };

  const openEditDialog = (chapter) => {
    setEditingChapter(chapter);
    setCreateForm({
      orderIndex: chapter.orderIndex,
      title: chapter.title || '',
      content: '', // Will be loaded by useEffect
      isFree: chapter.isFree,
      isPublished: chapter.isPublished
    });
    setDialogOpen(true);
  };

  const onUpdate = async (id, patch) => {
    try {
      await apiFetch(`/admin/chapters/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
      toast({ title: '已保存', description: '章节已更新' });
      await fetchChapters();
    } catch (e) {
      console.error(e);
      const msg = typeof e?.error === 'string' ? e.error : (typeof e?.message === 'string' ? e.message : '请稍后重试');
      toast({ variant: 'destructive', title: '保存失败', description: msg });
    }
  };

  const onDelete = async (id) => {
    if (!confirm('确认删除该章节？')) return;
    try {
      await apiFetch(`/admin/chapters/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast({ title: '已删除', description: '章节已删除' });
      await fetchChapters();
    } catch (e) {
      const msg = typeof e?.error === 'string' ? e.error : (typeof e?.message === 'string' ? e.message : '请稍后重试');
      toast({ variant: 'destructive', title: '删除失败', description: msg });
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Admin Chapters</title></Helmet>

      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">章节管理</h1>
            <p className="text-slate-400">小说：<span className="font-mono">{novelId}</span></p>
            <div className="mt-2 flex gap-4 text-sm">
              <Link to={`/admin/novels/${novelId}`} className="text-purple-400 hover:text-purple-300">返回小说</Link>
              <Link to={`/novel/${novelId}`} className="text-slate-400 hover:text-slate-200">前台查看</Link>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索序号/标题" className="bg-slate-900 border-slate-800 text-white h-11 w-full md:w-80 rounded-full" />
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingChapter(null);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" /> 新建章节
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle><span>{editingChapter ? '编辑章节' : '创建章节'}</span></DialogTitle>
                </DialogHeader>
                <form onSubmit={onSaveChapter} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label><span>序号（留空自动生成）</span></Label>
                      <Input type="number" value={createForm.orderIndex} onChange={(e) => setCreateForm((p) => ({ ...p, orderIndex: e.target.value }))} className="bg-slate-900 border-slate-800" placeholder="Auto" />
                    </div>
                    <div className="space-y-2">
                      <Label>标题（可选）</Label>
                      <Input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} className="bg-slate-900 border-slate-800" placeholder="无标题" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>内容</Label>
                    <Textarea value={createForm.content} onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))} className="bg-slate-900 border-slate-800 min-h-[220px]" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-slate-300">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={createForm.isPublished} onChange={(e) => setCreateForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                        <span>发布</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!createForm.isFree}
                          onChange={(e) => setCreateForm((p) => ({ ...p, isFree: !e.target.checked }))}
                        />
                        <span>付费章节</span>
                      </label>
                    </div>
                    <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /><span>{editingChapter ? '保存' : '创建'}</span></>}
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
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">序号</th>
                  <th className="px-6 py-4">标题</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">类型</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">加载中...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">暂无章节</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono text-slate-400">{c.orderIndex}</td>
                      <td className="px-6 py-4 text-white">{c.title}</td>
                      <td className="px-6 py-4">
                        {c.isPublished ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-700 text-slate-400">Draft</Badge>
                        )}
                        {c.isFree ? (
                          <Badge variant="outline" className="ml-2 border-slate-700 text-slate-300">Free</Badge>
                        ) : (
                          <Badge className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/20">Paid</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4"><span>{c.isFree ? '免费' : '付费（订阅解锁）'}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700"
                            onClick={() => onUpdate(c.id, { isPublished: !c.isPublished })}
                          >
                            <span>{c.isPublished ? '下线' : '发布'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700"
                            onClick={() => onUpdate(c.id, { isFree: !c.isFree })}
                          >
                            <span>{c.isFree ? '设为付费' : '设为免费'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700"
                            onClick={() => openEditDialog(c)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Link to={`/novel/${novelId}/chapter/${c.id}`} className="text-slate-400 hover:text-slate-200 text-sm">前台</Link>
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

export default AdminChapters;

