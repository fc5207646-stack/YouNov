
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Database, RefreshCw, HardDrive, Clock, CheckCircle, AlertTriangle, Loader2, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

const BackupManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [backuping, setBackuping] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchBackupInfo();
  }, []);

  const fetchBackupInfo = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/backup/status');
      setBackupInfo(data.status || null);
    } catch (error) {
      console.error("Error fetching backup info:", error);
      // Don't show toast on load error to avoid spam, just log it
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setBackuping(true);
    try {
      const data = await apiFetch('/admin/backup/run', { method: 'POST' });
      if (!data.ok) throw new Error(data.error || 'Backup failed');

      toast({
        title: "Backup Successful",
        description: "Database backup has been created and stored.",
        className: "bg-green-600 text-white border-none"
      });
      
      fetchBackupInfo();
    } catch (error) {
      console.error("Backup failed:", error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: error.message
      });
    } finally {
      setBackuping(false);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a backup ZIP file to restore."
      });
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backupFile', selectedFile);

      const data = await apiFetch('/admin/backup/restore', {
        method: 'POST',
        body: formData,
      });

      if (!data.ok) throw new Error(data.error || 'Restore failed');

      toast({
        title: "Restore Successful",
        description: "Database and resources have been restored from the backup.",
        className: "bg-green-600 text-white border-none"
      });

      setSelectedFile(null);
      fetchBackupInfo();
    } catch (error) {
      console.error("Restore failed:", error);
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: error.message
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <Card className="bg-slate-900 border-slate-800 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-accent-500" />
          Database Backup
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your system data snapshots. Backups run automatically every 6 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Status Card */}
          <div className="flex-1 bg-slate-950 rounded-lg p-4 border border-slate-800">
             <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-400">Latest Backup</span>
                {backupInfo ? (
                   <Badge className="bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50">
                      <CheckCircle className="w-3 h-3 mr-1" /> Available
                   </Badge>
                ) : (
                   <Badge variant="outline" className="text-yellow-500 border-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Not Found
                   </Badge>
                )}
             </div>
             
             {loading ? (
               <div className="flex items-center justify-center py-6 text-slate-500">
                 <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking...
               </div>
             ) : backupInfo ? (
               <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-accent-400" />
                    <span className="text-lg font-mono">
                      {new Date(backupInfo.lastBackupAt).toLocaleString()}
                    </span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="ml-7">
                      ({formatDistanceToNow(new Date(backupInfo.lastBackupAt), { addSuffix: true })})
                    </span>
                 </div>
                 <div className="flex items-center gap-3 pt-2">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span className="font-mono text-slate-300">
                      {formatBytes(backupInfo.sizeBytes || 0)}
                    </span>
                 </div>
               </div>
             ) : (
               <div className="py-4 text-slate-500 text-sm">
                 No backup file found in storage. Perform a manual backup to initialize.
               </div>
             )}
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Restore from Backup</span>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="backup-upload" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-600 file:text-white hover:file:bg-accent-700 cursor-pointer">
                <input
                  type="file"
                  id="backup-upload"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  <span>{selectedFile ? selectedFile.name : 'Choose a backup file'}</span>
                </div>
              </label>
            </div>
            <Button 
              onClick={handleRestore} 
              disabled={restoring || !selectedFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {restoring ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring...</>
              ) : (
                <>Restore from Selected File</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchBackupInfo} 
          disabled={loading}
          className="text-slate-400 hover:text-white"
        >
           <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </Button>
        <div className="flex items-center gap-3">
          {backupInfo ? (
            <a
              href="/api/admin/backup/download"
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
            >
              Download
            </a>
          ) : null}
          <Button 
            onClick={handleManualBackup} 
            disabled={backuping}
            className="bg-accent-600 hover:bg-accent-700 text-white"
          >
            {backuping ? (
               <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Backing up...</>
            ) : (
               <><Database className="w-4 h-4 mr-2" /> Backup Now</>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BackupManagement;
