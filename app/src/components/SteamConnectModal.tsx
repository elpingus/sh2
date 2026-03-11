import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

interface SteamConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardRequired?: (accountId: string, domain?: string | null) => void;
  onAccountAdded?: () => Promise<void> | void;
}

export default function SteamConnectModal({ open, onOpenChange, onGuardRequired, onAccountAdded }: SteamConnectModalProps) {
  const [steamUsername, setSteamUsername] = useState('');
  const [steamPassword, setSteamPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState(1);
  const [accountsCount, setAccountsCount] = useState(0);

  const loadMeta = async () => {
    const payload = await apiRequest<{ slots: number; accounts: Array<{ id: string }> }>('/steam/accounts');
    setSlots(payload.slots || 1);
    setAccountsCount((payload.accounts || []).length);
  };

  useEffect(() => {
    if (!open) return;
    setSteamUsername('');
    setSteamPassword('');

    loadMeta().catch(() => {
      toast.error('Failed to load account limits');
    });
  }, [open]);

  const addAccount = async () => {
    if (!steamUsername.trim() || !steamPassword.trim()) {
      toast.error('Steam username and password are required');
      return;
    }

    setSaving(true);
    try {
      const payload = await apiRequest<{
        account: { id: string };
        result?: { status: 'connected' | 'guard_required' | 'error'; domain?: string | null; message?: string } | null;
      }>('/steam/accounts', {
        method: 'POST',
        body: JSON.stringify({ steamUsername: steamUsername.trim(), steamPassword, connectNow: true }),
      });

      if (payload.result?.status === 'guard_required') {
        toast.info('Steam Guard required');
        onGuardRequired?.(payload.account.id, payload.result.domain || null);
      } else if (payload.result?.status === 'connected') {
        toast.success('Steam account added and connected');
      } else if (payload.result?.status === 'error') {
        toast.error(payload.result.message || 'Steam connect failed');
      } else {
        toast.success('Steam account added');
      }

      setSteamUsername('');
      setSteamPassword('');
      await loadMeta();
      await onAccountAdded?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Add account failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Add Steam Account ({accountsCount}/{slots})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 glass rounded-lg border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">Account list and management are on Overview table rows.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white">Steam Username</Label>
            <Input value={steamUsername} onChange={(e) => setSteamUsername(e.target.value)} placeholder="Steam username" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-3">
            <Label className="text-white">Steam Password</Label>
            <Input type="password" value={steamPassword} onChange={(e) => setSteamPassword(e.target.value)} placeholder="Password" className="bg-white/5 border-white/10 text-white" />
          </div>

          <Button onClick={addAccount} disabled={saving || accountsCount >= slots} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
          {accountsCount >= slots && <p className="text-xs text-amber-300">Account limit reached. Contact admin or upgrade your account slot limit.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
