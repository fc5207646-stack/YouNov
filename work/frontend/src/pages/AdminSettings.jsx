
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Globe, CreditCard, Search, Database, Loader2 } from 'lucide-react';
import BackupManagement from '@/components/BackupManagement';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // SEO Configuration
  const [seoConfig, setSeoConfig] = useState({
    siteTitle: 'YouNov',
    siteDescription: 'Your premium destination for web novels.',
    keywords: 'web novel, reading, books, fantasy, romance',
    ogImage: '',
    twitterHandle: '@younov'
  });

  // General Configuration
  const [generalConfig, setGeneralConfig] = useState({
    contactEmail: 'support@younov.com',
    maintenanceMode: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/admin/site-settings');
      const items = data.items || [];
      const seoData = items.find(s => s.key === 'seo_config');
      if (seoData?.value) setSeoConfig(prev => ({ ...prev, ...seoData.value }));

      const generalData = items.find(s => s.key === 'general_config');
      if (generalData?.value) setGeneralConfig(prev => ({ ...prev, ...generalData.value }));
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSEO = async () => {
    try {
      await apiFetch('/admin/site-settings/seo_config', { method: 'PUT', body: { value: seoConfig } });

      toast({
        title: "SEO Settings Saved",
        description: "Search engine optimization preferences updated.",
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleSaveGeneral = async () => {
    try {
      await apiFetch('/admin/site-settings/general_config', { method: 'PUT', body: { value: generalConfig } });

      toast({
        title: "General Settings Saved",
        description: "System configuration updated successfully.",
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-[80vh] items-center justify-center">
           <div className="flex flex-col items-center">
             <Loader2 className="w-10 h-10 animate-spin text-accent-500 mb-4" />
             <p className="text-slate-500">Loading configuration...</p>
           </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet><title>YouNov - Settings | 尤诺夫·小说阅读平台</title></Helmet>
      
      <div className="max-w-6xl mx-auto py-12 px-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
           <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">System Settings</h1>
           <p className="text-slate-400">Configure global preferences for the YouNov platform.</p>
        </motion.div>

        <Tabs defaultValue="seo" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-10 rounded-xl h-auto w-full md:w-auto grid grid-cols-2 md:inline-flex">
            <TabsTrigger value="seo" className="data-[state=active]:bg-accent-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all">
              <Search className="w-4 h-4" /> SEO & Meta
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-accent-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all">
              <Globe className="w-4 h-4" /> General
            </TabsTrigger>
            <TabsTrigger value="backup" className="data-[state=active]:bg-accent-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all">
              <Database className="w-4 h-4" /> Backup
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-accent-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all">
              <CreditCard className="w-4 h-4" /> Payment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="space-y-6 max-w-4xl">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden"
            >
               <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800/50 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   <Search className="w-5 h-5 text-accent-400" />
                   SEO Configuration
                 </h3>
               </div>
               
               <div className="p-8 space-y-6">
                 <div className="grid gap-2">
                    <Label className="text-slate-300">Default Site Title</Label>
                    <Input value={seoConfig.siteTitle} onChange={e => setSeoConfig({...seoConfig, siteTitle: e.target.value})} className="bg-slate-950 border-slate-700 h-11 focus:border-accent-500" />
                    <p className="text-xs text-slate-500">Appears in browser tabs and search results.</p>
                 </div>
                 
                 <div className="grid gap-2">
                    <Label className="text-slate-300">Meta Description</Label>
                    <Textarea 
                      value={seoConfig.siteDescription} 
                      onChange={e => setSeoConfig({...seoConfig, siteDescription: e.target.value})} 
                      className="bg-slate-950 border-slate-700 min-h-[100px] focus:border-accent-500"
                    />
                    <p className="text-xs text-slate-500">Recommended length: 150-160 characters.</p>
                 </div>
                 
                 <div className="grid gap-2">
                    <Label className="text-slate-300">Meta Keywords</Label>
                    <Input value={seoConfig.keywords} onChange={e => setSeoConfig({...seoConfig, keywords: e.target.value})} className="bg-slate-950 border-slate-700 h-11 focus:border-accent-500" />
                    <p className="text-xs text-slate-500">Comma-separated list of keywords.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                   <div className="grid gap-2">
                      <Label className="text-slate-300">OG Image URL</Label>
                      <Input value={seoConfig.ogImage} onChange={e => setSeoConfig({...seoConfig, ogImage: e.target.value})} className="bg-slate-950 border-slate-700 h-11 focus:border-accent-500" placeholder="https://..." />
                   </div>
                   <div className="grid gap-2">
                      <Label className="text-slate-300">Twitter Handle</Label>
                      <Input value={seoConfig.twitterHandle} onChange={e => setSeoConfig({...seoConfig, twitterHandle: e.target.value})} className="bg-slate-950 border-slate-700 h-11 focus:border-accent-500" />
                   </div>
                 </div>

                 <div className="pt-6">
                    <Button onClick={handleSaveSEO} className="w-full md:w-auto bg-accent-600 hover:bg-accent-700 text-white shadow-lg shadow-accent-900/20">
                      <Save className="w-4 h-4 mr-2" /> Save SEO Settings
                    </Button>
                 </div>
               </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="general" className="space-y-6 max-w-4xl">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden"
            >
               <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800/50">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   <Globe className="w-5 h-5 text-accent-400" />
                   General Configuration
                 </h3>
               </div>

               <div className="p-8 space-y-6">
                 <div className="grid gap-2">
                    <Label className="text-slate-300">Support Email</Label>
                    <Input value={generalConfig.contactEmail} onChange={e => setGeneralConfig({...generalConfig, contactEmail: e.target.value})} className="bg-slate-950 border-slate-700 h-11 focus:border-accent-500" />
                 </div>
                 
                 <div className="flex items-center gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800">
                    <input 
                      type="checkbox" 
                      id="maintenance"
                      checked={generalConfig.maintenanceMode} 
                      onChange={e => setGeneralConfig({...generalConfig, maintenanceMode: e.target.checked})}
                      className="w-6 h-6 rounded border-slate-700 bg-slate-800 text-accent-600 focus:ring-accent-500"
                    />
                    <div>
                      <Label htmlFor="maintenance" className="text-lg font-medium text-white cursor-pointer block mb-1">Maintenance Mode</Label>
                      <p className="text-sm text-slate-400">Enable this to prevent non-admin users from accessing the site.</p>
                    </div>
                 </div>

                 <div className="pt-4">
                    <Button onClick={handleSaveGeneral} className="w-full md:w-auto bg-accent-600 hover:bg-accent-700 text-white shadow-lg shadow-accent-900/20">
                      <Save className="w-4 h-4 mr-2" /> Save General Settings
                    </Button>
                 </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6 max-w-4xl">
             <BackupManagement />
          </TabsContent>

          <TabsContent value="payment" className="space-y-6 max-w-4xl">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl p-16 text-center"
            >
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CreditCard className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Payment Gateway</h3>
              <p className="text-slate-400 max-w-md mx-auto mb-8">Secure payment integration settings will appear here. This feature requires backend implementation.</p>
              <Button variant="outline" className="border-slate-700 text-slate-400" disabled>Feature Coming Soon</Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
