
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ShieldCheck, Plus, Trash2, Globe, AlertCircle, Loader2, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/components/AdminLayout';
import { apiFetch } from '@/lib/apiClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AdminIpWhitelist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // IP Detection States
  const [currentIp, setCurrentIp] = useState(null);
  const [ipLoading, setIpLoading] = useState(false);
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWhitelist = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/admin/ip-whitelist');
      setWhitelist(data.items || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load IP whitelist."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const detectCurrentIp = useCallback(async () => {
    setIpLoading(true);
    try {
      // Use backend (what the server sees)
      const data = await apiFetch('/ip/check');
      if (data?.ip) setCurrentIp(data.ip);
    } catch (e) {
      console.error("Failed to detect IP", e);
    } finally {
      setIpLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhitelist();
    detectCurrentIp();
  }, [fetchWhitelist, detectCurrentIp]);

  const handleUseMyIp = () => {
    if (currentIp) {
      setNewIp(currentIp);
      if (!description) setDescription("Admin Access (My IP)");
      toast({
        title: "IP Applied",
        description: `Added ${currentIp} to the form.`
      });
    } else {
      detectCurrentIp();
    }
  };

  const handleAddIp = async () => {
    if (!newIp) {
      toast({ variant: "destructive", title: "IP Address required" });
      return;
    }

    // Basic IP/CIDR validation (supports:
    // - IPv4 (1.2.3.4) or IPv4/32
    // - IPv6 (2001:db8::1) or IPv6/128
    const value = newIp.trim();
    const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}(?:\/32)?$/;
    const ipv6 = /^[0-9a-fA-F:]+(?:\/128)?$/;
    if (!ipv4.test(value) && !ipv6.test(value)) {
      toast({
        variant: "destructive",
        title: "Invalid Format",
        description: "Please enter IPv4/IPv6 (optionally with /32 or /128). Example: 203.0.113.1, 203.0.113.1/32, 2001:db8::1, 2001:db8::1/128"
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch('/admin/ip-whitelist', {
        method: 'POST',
        body: {
          ipCidr: value,
          note: description.trim() || null,
          enabled: true
        }
      });

      toast({
        title: "Success",
        description: "IP address has been whitelisted."
      });
      
      setNewIp('');
      setDescription('');
      setIsDialogOpen(false);
      fetchWhitelist();
    } catch (error) {
      console.error("Add IP Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add IP."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this IP from the whitelist? Access may be blocked immediately.")) return;

    try {
      await apiFetch(`/admin/ip-whitelist/${encodeURIComponent(id)}`, { method: 'DELETE' });

      toast({
        title: "Deleted",
        description: "IP removed from whitelist."
      });
      
      setWhitelist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete IP."
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ description: "IP copied to clipboard" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <Helmet>
          <title>YouNov - IP Whitelist | 尤诺夫·小说阅读平台</title>
        </Helmet>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-green-500 w-8 h-8" />
              IP Whitelist
            </h1>
            <p className="text-slate-400 mt-1">
              Manage trusted IPs that bypass all Geo-blocking and VPN restrictions.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20">
                <Plus className="w-4 h-4 mr-2" />
                Add New IP
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Whitelist an IP Address</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter an IP address to exempt it from security restrictions.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ip" className="text-slate-200">IP Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ip"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      placeholder="e.g. 203.0.113.1"
                      className="bg-slate-800 border-slate-700 text-white font-mono"
                    />
                  </div>
                  
                  {/* Smart IP Detection Helper */}
                  <div className="bg-slate-800/50 rounded-md p-3 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">
                        Your IP: <span className="font-mono text-white">{ipLoading ? "Detecting..." : (currentIp || "Unknown")}</span>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleUseMyIp}
                      disabled={ipLoading || !currentIp}
                      className="h-7 text-xs bg-accent-600 hover:bg-accent-700 text-white border-none"
                    >
                      {ipLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      Use My IP
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-slate-200">Description</Label>
                  <Input
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Admin Home Office"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="mr-2">Cancel</Button>
                <Button 
                  onClick={handleAddIp} 
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Add to Whitelist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Your Current Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-500/10 rounded-lg">
                  <Globe className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {ipLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (currentIp || "Unknown")}
                  </div>
                  <p className="text-xs text-slate-500">This is the IP address our server sees.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">Active</div>
                  <p className="text-xs text-slate-500">Whitelist rules are currently enforced.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-slate-800 hover:bg-slate-950/50">
                <TableHead className="text-slate-400 font-medium pl-6">IP Address</TableHead>
                <TableHead className="text-slate-400 font-medium">Description</TableHead>
                <TableHead className="text-slate-400 font-medium">Added</TableHead>
                <TableHead className="text-right text-slate-400 font-medium pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
                      <p>Loading whitelist entries...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : whitelist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No IPs currently whitelisted.
                  </TableCell>
                </TableRow>
              ) : (
                whitelist.map((item) => (
                  <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-mono text-slate-200 pl-6">
                      <div className="flex items-center gap-2">
                        {item.ipCidr}
                        <button
                          onClick={() => copyToClipboard(item.ipCidr)}
                          className="opacity-0 group-hover:opacity-100 hover:text-white text-slate-600 transition-opacity"
                          title="Copy IP"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {currentIp === item.ipCidr && (
                          <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-900/50">YOU</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{item.note || '-'}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-400 hover:bg-red-950/20"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIpWhitelist;
