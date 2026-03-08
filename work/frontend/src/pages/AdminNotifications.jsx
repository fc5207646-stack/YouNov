
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Check, Trash2, MailOpen, Clock, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const AdminNotifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/notifications');
      setNotifications(data.items || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load notifications." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(`/admin/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isRead: true } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleMarkAsUnread = async (id) => {
    try {
      await apiFetch(`/admin/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isRead: false } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/admin/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({ title: "Deleted", description: "Notification removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete notification." });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length === 0) return;

      await Promise.all(unreadIds.map((id) => apiFetch(`/admin/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isRead: true } })));
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast({ title: "Success", description: "All notifications marked as read." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark all as read." });
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch('/admin/notifications', {
        method: 'POST',
        body: { title: form.title.trim(), message: form.message.trim() }
      });
      setCreateOpen(false);
      setForm({ title: '', message: '' });
      setNotifications((prev) => [data.notification, ...prev]);
      toast({ title: 'Created', description: 'Notification published.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: e?.error || 'Failed to create notification.' });
    } finally {
      setCreating(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Notifications</title></Helmet>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-accent-500" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount} New</span>
              )}
            </h1>
            <p className="text-slate-400 mt-1">Manage system alerts and user messages</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} className="bg-accent-600 hover:bg-accent-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> New
            </Button>
            <Button onClick={handleMarkAllRead} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all read
            </Button>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Create notification</DialogTitle>
              <DialogDescription className="text-slate-400">
                Publish a system notice for admins (and later can be extended to users).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-slate-300">Title</div>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white"
                  placeholder="e.g. Maintenance notice"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-slate-300">Message</div>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-white min-h-[120px]"
                  placeholder="Write your message..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="bg-accent-600 hover:bg-accent-700 text-white">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="all" onValueChange={setFilter} className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 mb-6">
            <TabsTrigger value="all">All Messages</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <MailOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">No notifications found.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    layout
                  >
                    <Card className={`p-5 border transition-all ${notification.isRead ? 'bg-slate-900 border-slate-800 opacity-70' : 'bg-slate-800 border-accent-500/30 shadow-lg shadow-accent-900/10'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {!notification.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                            <h3 className={`font-semibold text-lg ${notification.isRead ? 'text-slate-400' : 'text-white'}`}>
                              {notification.title}
                            </h3>
                          </div>
                          <p className="text-slate-300 text-sm mb-3 leading-relaxed">{notification.message}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!notification.isRead && (
                            <Button size="icon" variant="ghost" onClick={() => handleMarkAsRead(notification.id)} title="Mark as Read" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400">
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {notification.isRead && (
                            <Button size="icon" variant="ghost" onClick={() => handleMarkAsUnread(notification.id)} title="Mark as Unread" className="h-8 w-8 hover:bg-slate-700/40 hover:text-white">
                              <MailOpen className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(notification.id)} title="Delete" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
