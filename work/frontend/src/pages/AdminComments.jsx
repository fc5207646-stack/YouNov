import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Trash2, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleError } from '@/utils/errorHandler';
import { apiFetch } from '@/lib/apiClient';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const data = await apiFetch('/admin/comments?take=200&skip=0');
      setComments(data.items || []);
    } catch (error) {
      handleError(error, 'fetching comments');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    
    try {
      await apiFetch(`/admin/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });

      toast({ title: "Deleted", description: "Comment removed successfully" });
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      handleError(error, 'deleting comment');
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Manage Comments</title></Helmet>
      
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="mb-10 flex items-center justify-between">
           <div>
             <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Comment Moderation</h1>
             <p className="text-slate-400">Review and manage discussion across all novels.</p>
           </div>
           <div className="hidden md:block">
              <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-slate-400 text-sm">
                 Total Comments: <span className="text-white font-bold ml-1">{comments.length}</span>
              </div>
           </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
               <div className="animate-spin w-8 h-8 border-t-2 border-purple-500 rounded-full mx-auto mb-4"></div>
               <p className="text-slate-500">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-24 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
               <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-slate-500 mb-2">No comments yet</h3>
               <p className="text-slate-600">User comments will appear here once posted.</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <motion.div 
                key={comment.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 hover:shadow-lg transition-all group"
              >
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-3 text-sm">
                      <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {comment.user?.email || comment.user?.displayName || comment.user?.username || 'Unknown User'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-500/20">
                         <span className="font-medium truncate max-w-[150px]">{comment.novel?.title}</span>
                         <span className="text-purple-600">/</span>
                         <span>Ch. {comment.chapter?.orderIndex}</span>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-base pl-1 border-l-2 border-slate-800 group-hover:border-purple-500/50 transition-colors">
                      {comment.content}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteComment(comment.id)}
                    className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-full transition-colors flex-shrink-0"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminComments;