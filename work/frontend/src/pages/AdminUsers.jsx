import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Shield, Ban, UserCheck, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleError } from '@/utils/errorHandler';
import { apiFetch } from '@/lib/apiClient';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch('/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      handleError(error, 'fetching users');
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId, currentStatus) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: { ban: { isBanned: !currentStatus } }
      });

      toast({ title: "Success", description: `User ${!currentStatus ? 'banned' : 'unbanned'} successfully` });
      fetchUsers();
    } catch (error) {
      handleError(error, 'updating ban status');
    }
  };

  const toggleRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
      await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: { role: newRole } });

      toast({ title: "Success", description: `User role updated to ${newRole}` });
      fetchUsers();
    } catch (error) {
      handleError(error, 'updating role');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Manage Users</title></Helmet>
      
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">User Management</h1>
            <p className="text-slate-400">View and manage {users.length} registered accounts.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by email / name / username..." 
              className="pl-10 bg-slate-900 border-slate-800 text-white h-11 focus:border-accent-500 rounded-full shadow-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-8 py-5">User Profile</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Subscription</th>
                  <th className="px-6 py-5">Joined</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan="6" className="px-8 py-12 text-center text-slate-500 animate-pulse">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" className="px-8 py-12 text-center text-slate-500">No users found matching your search.</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.tr 
                      key={user.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-white font-medium text-base">
                             <Mail className="w-3.5 h-3.5 text-accent-400" />
                             {user.email || 'Unknown User'}
                          </div>
                          <span className="text-xs text-slate-400">{user.displayName}{user.username ? ` (@${user.username})` : ''}</span>
                          <span className="text-xs text-slate-500 font-mono">{user.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {user.role === 'ADMIN' ? (
                          <Badge className="bg-accent-500/20 text-accent-400 border-accent-500/20 hover:bg-accent-500/30">Admin</Badge>
                        ) : (
                          <span className="text-slate-500 bg-slate-800/50 px-2 py-1 rounded text-xs">User</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {user.isBanned ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1">
                            <Ban className="w-3 h-3" /> Banned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/20 flex w-fit items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-slate-600 text-xs uppercase tracking-wider">-</span>
                      </td>
                      <td className="px-6 py-5 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-700 rounded-full">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 shadow-xl rounded-lg w-48">
                            <DropdownMenuItem onClick={() => toggleRole(user.id, user.role)} className="cursor-pointer focus:bg-slate-800 text-slate-300">
                              <Shield className="w-4 h-4 mr-2" /> 
                              {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleBan(user.id, user.isBanned)} className={`cursor-pointer focus:bg-slate-800 ${user.isBanned ? "text-green-400" : "text-red-400"}`}>
                              {user.isBanned ? (
                                <><UserCheck className="w-4 h-4 mr-2" /> Unban User</>
                              ) : (
                                <><Ban className="w-4 h-4 mr-2" /> Ban User</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
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

export default AdminUsers;