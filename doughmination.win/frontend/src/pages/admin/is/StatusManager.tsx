import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useTheme from '@/hooks/useTheme';

interface Member {
  id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  status?: {
    text: string;
    emoji?: string;
    updated_at: string;
  } | null;
}

const EMOJI_SUGGESTIONS = [
  '💤', '🎮', '📚', '🎨', '🎵', '💻', '🌙', '☀️', 
  '🍕', '☕', '🎬', '✨', '💭', '😴', '🏃', '🧘'
];

export default function StatusManager() {
  const [theme] = useTheme()
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [statusText, setStatusText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', content: string} | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      const member = members.find(m => m.name === selectedMember);
      if (member?.status) {
        setStatusText(member.status.text);
        setEmoji(member.status.emoji || '');
      } else {
        setStatusText('');
        setEmoji('');
      }
    }
  }, [selectedMember, members]);

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const regularMembers = data
          .filter((m: Member) => !m.is_cofront && !m.is_special)
          .sort((a: Member, b: Member) =>
            (a.display_name || a.name).toLowerCase()
              .localeCompare((b.display_name || b.name).toLowerCase())
          );

        setMembers(regularMembers);
      } else {
        setMessage({ type: 'error', content: 'Failed to fetch members' });
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setMessage({ type: 'error', content: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember) {
      setMessage({ type: 'error', content: 'Please select a member' });
      return;
    }

    if (!statusText.trim()) {
      setMessage({ type: 'error', content: 'Status text is required' });
      return;
    }

    if (statusText.length > 100) {
      setMessage({ type: 'error', content: 'Status must be ≤ 100 chars' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return setMessage({ type: 'error', content: 'Authentication required' });

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/members/${selectedMember}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: statusText.trim(),
          emoji: emoji || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update status');
      }

      setMessage({ type: 'success', content: 'Status updated!' });
      await fetchMembers();
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    if (!selectedMember) {
      setMessage({ type: 'error', content: 'Please select a member' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return setMessage({ type: 'error', content: 'Authentication required' });

    if (!window.confirm(`Clear status for ${selectedMember}?`)) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/members/${selectedMember}/status`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to clear status');
      }

      setStatusText('');
      setEmoji('');
      setMessage({ type: 'success', content: 'Status cleared!' });
      await fetchMembers();
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentStatus = () => {
    if (!selectedMember) return null;
    return members.find(m => m.name === selectedMember)?.status;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="text-center font-comic">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">Status Manager</h1>
            <p className="text-muted-foreground font-comic">Update member status messages</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/dashboard" className="font-comic">Back to Dashboard</Link>
          </Button>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-comic">Update Status</CardTitle>
            <CardDescription className="font-comic">Select a member and set their status</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* MEMBER SELECT */}
              <div className="space-y-2">
                <Label htmlFor="member-select" className="font-comic">Select Member</Label>

                {/* ⭐ FIXED: Added name="member" here */}
                <Select
                  name="member"
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                >
                  <SelectTrigger id="member-select" className="font-comic">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>

                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.name} className="font-comic">
                        <div className="flex items-center gap-2">
                          {member.avatar_url && (
                            <img 
                              src={member.avatar_url}
                              alt={member.display_name || member.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <span>{member.display_name || member.name}</span>
                          {member.status && (
                            <span className="text-xs text-muted-foreground">(has status)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMember && (
                <>
                  {/* EMOJI */}
                  <div className="space-y-2">
                    <Label className="font-comic">
                      Emoji (optional)

                      <div className="flex gap-2 items-center mt-2">
                        <Input
                          id="emoji"
                          type="text"
                          value={emoji}
                          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                          placeholder="😊"
                          className="w-20 text-center text-2xl font-comic"
                          maxLength={2}
                        />

                        <div className="flex flex-wrap gap-1">
                          {EMOJI_SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEmoji(s)}
                              aria-label={`Select emoji ${s}`}
                              className="w-8 h-8 text-xl hover:bg-accent rounded transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* STATUS TEXT */}
                  <div className="space-y-2">
                    <Label htmlFor="statusText" className="font-comic">Status Text</Label>

                    <div className="space-y-1">
                      <Input
                        id="statusText"
                        type="text"
                        name="statusText"    // optional, but helps autofill
                        value={statusText}
                        onChange={(e) => setStatusText(e.target.value)}
                        placeholder="What's happening?"
                        className="font-comic"
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground font-comic text-right">
                        {statusText.length}/100 characters
                      </p>
                    </div>
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={saving || !statusText.trim()}
                      className="font-comic flex-1"
                    >
                      {saving ? 'Updating...' : 'Update Status'}
                    </Button>

                    {getCurrentStatus() && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleClearStatus}
                        disabled={saving}
                        className="font-comic"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* CURRENT STATUS */}
                  {getCurrentStatus() && (
                    <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground font-comic mb-1">Current Status:</p>

                      <div className="flex items-center gap-2">
                        {getCurrentStatus()?.emoji && (
                          <span className="text-xl">{getCurrentStatus()?.emoji}</span>
                        )}
                        <p className="font-comic text-sm">{getCurrentStatus()?.text}</p>
                      </div>

                      <p className="text-xs text-muted-foreground font-comic mt-1">
                        Updated {new Date(getCurrentStatus()!.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* MEMBERS WITH STATUS */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">Members with Active Status</CardTitle>
            <CardDescription className="font-comic">
              {members.filter(m => m.status).length} member(s) have status set
            </CardDescription>
          </CardHeader>

          <CardContent>
            {members.filter(m => m.status).length > 0 ? (
              <div className="space-y-3">
                {members.filter(m => m.status).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member.name)}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    {member.avatar_url && (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name || member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-comic font-semibold text-sm">
                        {member.display_name || member.name}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        {member.status?.emoji && (
                          <span className="text-sm">{member.status.emoji}</span>
                        )}

                        <p className="text-xs text-muted-foreground font-comic truncate">
                          {member.status?.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-comic text-center py-4">
                No members have status set
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
