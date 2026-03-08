import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Save, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/apiClient';

const AdminNovelDetail = () => {
  const { id } = useParams(); // 这里约定为 slug
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novel, setNovel] = useState(null);

  const [form, setForm] = useState({
    title: '',
    authorName: '',
    coverUrl: '',
    description: '',
    tags: '',
    isPublished: true,
    status: 'ONGOING'
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/admin/novels/${encodeURIComponent(id)}`);
        if (!data || !data.novel) {
          throw new Error('无法加载小说数据: 返回数据格式错误');
        }
        setNovel(data.novel);
        setForm({
          title: data.novel.title || '',
          authorName: data.novel.authorName || '',
          coverUrl: data.novel.coverUrl || '',
          description: data.novel.description || '',
          tags: Array.isArray(data.novel.tags) ? data.novel.tags.join(',') : '',
          isPublished: Boolean(data.novel.isPublished),
          status: data.novel.status || 'ONGOING'
        });
      } catch (e) {
        const msg = typeof e?.error === 'string' ? e.error : (typeof e?.message === 'string' ? e.message : '无法加载小说详情');
        toast({ variant: 'destructive', title: '加载失败', description: msg });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      console.log('Saving novel with cover:', form.coverUrl);
      const payload = {
        title: form.title.trim(),
        authorName: form.authorName.trim(),
        coverUrl: form.coverUrl ? form.coverUrl.trim() : null, // Ensure empty string becomes null
        description: form.description.trim(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isPublished: Boolean(form.isPublished),
        status: form.status || 'ONGOING'
      };
      const data = await apiFetch(`/admin/novels/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
      setNovel(data.novel);
      toast({ title: '已保存', description: '小说信息已更新', className: 'bg-green-600 text-white border-none' });
    } catch (e2) {
      console.error('Save error details:', e2);
      let errorMsg = '未知错误';
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
        console.error("Error parsing error object:", parseErr);
        errorMsg = "保存失败，且无法解析错误信息";
      }
      toast({ variant: 'destructive', title: '保存失败', description: String(errorMsg) });
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Simple validation
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: '格式错误', description: '请上传图片文件' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: '文件过大', description: '图片大小不能超过 5MB' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use apiFetch instead of raw fetch to handle auth automatically
      // apiFetch will preserve FormData content-type (browser sets it with boundary)
      const data = await apiFetch('/admin/upload', {
        method: 'POST',
        body: formData
      });
      
      // Update form with the returned URL
      console.log('Uploaded cover:', data.url);
      setForm(p => ({ ...p, coverUrl: data.url }));
      toast({ title: '上传成功', description: `封面已上传` });
    } catch (e) {
      console.error('Upload error:', e);
      const msg = typeof e.message === 'string' ? e.message : (typeof e.error === 'string' ? e.error : JSON.stringify(e));
      toast({ variant: 'destructive', title: '上传失败', description: msg });
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const onDelete = async () => {
    if (!confirm('确认删除该小说？将同时删除其章节。')) return;
    try {
      await apiFetch(`/admin/novels/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast({ title: '已删除', description: '小说已删除' });
      navigate('/admin/novels');
    } catch (e) {
      const msg = typeof e?.error === 'string' ? e.error : (typeof e?.message === 'string' ? e.message : '请稍后重试');
      toast({ variant: 'destructive', title: '删除失败', description: msg });
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Admin Novel Detail</title></Helmet>

      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">小说详情</h1>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="font-mono">{id}</span>
              {novel?.isPublished ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Published</Badge>
              ) : (
                <Badge variant="outline" className="border-slate-700 text-slate-400">Draft</Badge>
              )}
              <Link className="text-accent-400 hover:text-accent-300" to={`/admin/novels/${id}/chapters`}>管理章节</Link>
              <Link className="text-slate-400 hover:text-slate-200" to={`/novel/${id}`}>前台查看</Link>
            </div>
          </div>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            <span>删除</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">加载中...</div>
        ) : (
          <form onSubmit={onSave} className="space-y-5 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="bg-slate-950 border-slate-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label>作者</Label>
                <Input value={form.authorName} onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))} className="bg-slate-950 border-slate-800 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>封面 URL</Label>
              <div className="flex gap-2">
                <Input value={form.coverUrl} onChange={(e) => setForm((p) => ({ ...p, coverUrl: e.target.value }))} className="bg-slate-950 border-slate-800 text-white" />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-slate-700" 
                  onClick={() => document.getElementById('cover-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
                <input 
                  id="cover-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={onUpload} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>简介</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="bg-slate-950 border-slate-800 text-white min-h-[140px]" />
            </div>

            <div className="space-y-2">
              <Label>标签（逗号分隔）</Label>
              <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="bg-slate-950 border-slate-800 text-white" />
            </div>

            <div className="space-y-2">
              <Label>连载状态</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="ONGOING"
                    checked={form.status === 'ONGOING'}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                  />
                  <span className="text-white">连载中</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="COMPLETED"
                    checked={form.status === 'COMPLETED'}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                  />
                  <span className="text-white">已完结</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300 flex items-center gap-2">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                <span>发布</span>
              </label>
              <Button type="submit" disabled={saving} className="bg-accent-600 hover:bg-accent-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /><span>保存</span></>}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminNovelDetail;

