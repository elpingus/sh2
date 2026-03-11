import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, X, Plus, Save, Gamepad2, Globe } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SteamGame {
  id: string;
  appId: string;
  name: string;
  icon?: string;
  isFree?: boolean;
}

export default function Games() {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGames, setSelectedGames] = useState<SteamGame[]>([]);
  const [searchResults, setSearchResults] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const { user, refreshUser } = useAuth();

  const maxGames = user?.maxGames ?? 1;

  const loadGames = async () => {
    try {
      const [selected] = await Promise.all([
        apiRequest<{ games: SteamGame[] }>('/games'),
      ]);
      setSelectedGames(selected.games || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const payload = await apiRequest<{ games: SteamGame[] }>(`/steam/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(payload.games || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Steam search failed');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const visiblePool = useMemo(() => searchResults, [searchResults]);

  const addGame = async (game: SteamGame) => {
    if (selectedGames.length >= maxGames) {
      toast.error(`Plan limit reached (${maxGames})`);
      return;
    }

    if (selectedGames.find((g) => g.appId === game.appId)) {
      return;
    }

    setSaving(true);
    try {
      const payload = await apiRequest<{ games: SteamGame[] }>('/games', {
        method: 'POST',
        body: JSON.stringify({
          appId: game.appId,
          name: game.name,
          icon: game.icon || '',
          isFree: Boolean(game.isFree),
        }),
      });

      setSelectedGames(payload.games || []);
      await refreshUser();
      toast.success('Game added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add game');
    } finally {
      setSaving(false);
    }
  };

  const removeGame = async (appId: string) => {
    setSaving(true);
    try {
      const payload = await apiRequest<{ games: SteamGame[] }>(`/games/${appId}`, {
        method: 'DELETE',
      });

      setSelectedGames(payload.games || []);
      await refreshUser();
      toast.success('Game removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove game');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-slate-400">Search the full Steam catalog. Free games can be added even if they are not in your library.</p>
        </div>
        <Button
          onClick={() => setSearchModalOpen(true)}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          disabled={loading || saving}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Games
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Selected Games</h3>
          <span className="text-sm text-slate-400">{selectedGames.length} / {maxGames}</span>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : selectedGames.length === 0 ? (
          <div className="text-center py-12">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No games selected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedGames.map((game) => (
              <motion.div key={game.appId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-3">
                  {game.icon ? (
                    <img src={game.icon} alt={game.name} className="w-12 h-12 rounded-xl object-cover bg-slate-800" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-violet-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{game.name}</p>
                    <p className="text-sm text-slate-500">App ID: {game.appId}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeGame(game.appId)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10" disabled={saving}>
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Steam Games</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="default" className="bg-violet-600 hover:bg-violet-700">
                <Globe className="w-4 h-4 mr-2" />
                All Steam Games
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search all Steam games, including free titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
                {!searchQuery ? (
                  <p className="text-center text-slate-500 py-4">Type to search the full Steam catalog. Library ownership is not required for free games.</p>
                ) : searching ? (
                  <p className="text-center text-slate-400 py-4">Searching...</p>
                ) : visiblePool.length > 0 ? (
                visiblePool
                  .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 120)
                  .map((game) => {
                    const isSelected = selectedGames.some((g) => g.appId === game.appId);
                    const isLimitReached = selectedGames.length >= maxGames;

                    return (
                      <button
                        key={game.appId}
                        onClick={() => addGame(game)}
                        disabled={isSelected || isLimitReached || saving}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isSelected ? 'bg-violet-500/20 cursor-not-allowed' : isLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
                        }`}
                      >
                        {game.icon ? (
                          <img src={game.icon} alt={game.name} className="w-10 h-10 rounded-lg object-cover bg-slate-800 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{game.name}</p>
                          <p className="text-xs text-slate-500">App ID: {game.appId}</p>
                        </div>
                        {isSelected && <span className="text-violet-400 text-sm">Selected</span>}
                      </button>
                    );
                  })
              ) : (
                <p className="text-center text-slate-500 py-4">No games found</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-sm text-slate-400">{selectedGames.length} / {maxGames}</span>
              <Button onClick={() => setSearchModalOpen(false)} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
