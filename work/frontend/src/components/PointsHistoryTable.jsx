
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

const PointsHistoryTable = ({ userId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const data = await apiFetch('/points/ledger');
      setHistory(data.items || []);
    } catch (error) {
      console.error('Error fetching points history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent-500" /></div>;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-stone-50">
            <TableHead className="text-slate-400">Date</TableHead>
            <TableHead className="text-slate-400">Activity</TableHead>
            <TableHead className="text-right text-slate-400">Delta</TableHead>
            <TableHead className="text-right text-slate-400">Reason</TableHead>
            <TableHead className="text-right text-slate-400">Meta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                No points history found.
              </TableCell>
            </TableRow>
          ) : (
            history.map((item) => (
              <TableRow key={item.id} className="border-slate-200 hover:bg-stone-50">
                <TableCell className="text-slate-300">
                  {format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-accent-500/30 text-accent-400 capitalize">
                    {item.reason}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${item.delta >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {item.delta >= 0 ? `+${item.delta}` : item.delta}
                </TableCell>
                <TableCell className="text-right text-slate-300">
                  {item.reason}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {item.metadata ? JSON.stringify(item.metadata).slice(0, 60) : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PointsHistoryTable;
