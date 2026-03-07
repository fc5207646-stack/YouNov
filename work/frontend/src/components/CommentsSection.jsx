
import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const CommentsSection = ({ novelId, chapterId }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => Boolean(user && content.trim().length > 0), [user, content]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/chapters/${encodeURIComponent(chapterId)}/comments?take=50&skip=0`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: '加载失败', description: e?.error || '无法加载评论' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chapterId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const submit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: '请先登录', description: '登录后才能发表评论' });
      return;
    }
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const data = await apiFetch(`/chapters/${encodeURIComponent(chapterId)}/comments`, {
        method: 'POST',
        body: { content: content.trim() }
      });
      setContent('');
      // 乐观插入（接口也会返回 user 信息）
      setItems((prev) => [...prev, data.comment]);
      setTotal((t) => t + 1);
      toast({ title: '已发布', description: '评论已提交' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: '发布失败', description: e?.error || '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('确认删除这条评论？')) return;
    try {
      await apiFetch(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast({ title: '已删除', description: '评论已删除' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: '删除失败', description: e?.error || '请稍后重试' });
    }
  };

  return (
    <div className="mt-12 max-w-3xl mx-auto bg-slate-900/50 rounded-xl p-6 border border-slate-800">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <h3 className="text-xl font-semibold text-white">评论</h3>
          <span className="text-xs text-slate-500">({total})</span>
        </div>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={load} disabled={loading}>
          刷新
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={user ? '写下你的想法…' : '登录后才能发表评论'}
          className="bg-slate-950 border-slate-800 text-white min-h-[90px]"
          disabled={!user || submitting}
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            章节：<span className="font-mono">{chapterId}</span> · 小说：<span className="font-mono">{novelId}</span>
          </div>
          <Button onClick={submit} disabled={!canSubmit || submitting} className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4 mr-2" />
            发布
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-6 text-center">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center">暂无评论</div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => {
            const mine = user && c.user?.id === user.id;
            return (
              <div key={c.id} className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-200 font-medium">
                      {c.user?.displayName || c.user?.username || '匿名用户'}
                      {mine ? <span className="ml-2 text-[10px] text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded">我的</span> : null}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                  {mine ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-950/20"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  ) : null}
                </div>
                <div className="text-slate-300 mt-3 whitespace-pre-wrap">{c.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
