import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTheme from '@/hooks/useTheme';

interface MentalState {
  level: string;
  notes?: string;
  updated_at: string;
}

const MentalHealthManager: React.FC = () => {
  const [theme] = useTheme();
  const [mentalState, setMentalState] = useState<MentalState | null>(null);
  const [selectedMentalState, setSelectedMentalState] = useState('');
  const [mentalStateNotes, setMentalStateNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  const mentalStateOptions = [
    { value: 'safe', label: 'Safe', icon: '✅', color: 'bg-green-100 dark:bg-green-900 border-green-500' },
    { value: 'unstable', label: 'Unstable', icon: '⚠️', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500' },
    { value: 'idealizing', label: 'Idealizing', icon: '❗', color: 'bg-orange-100 dark:bg-orange-900 border-orange-500' },
    { value: 'self-harming', label: 'Self-Harming', icon: '🚨', color: 'bg-red-100 dark:bg-red-900 border-red-500' },
    { value: 'highly at risk', label: 'Highly At Risk', icon: '⛔', color: 'bg-red-200 dark:bg-red-950 border-red-700' }
  ];

  useEffect(() => {
    fetchMentalState();
  }, []);

  const fetchMentalState = async () => {
    try {
      const res = await fetch('/api/mental-state');
      if (res.ok) {
        const data = await res.json();
        setMentalState(data);
        setSelectedMentalState(data.level);
        setMentalStateNotes(data.notes || '');
      }
    } catch (err) {
      console.error('Error fetching mental state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMentalState = async () => {
    if (!selectedMentalState) {
      setMessage({ type: 'error', content: 'Please select a mental state level.' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required.' });
      return;
    }

    setMessage(null);
    setSaving(true);

    try {
      const response = await fetch('/api/mental-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          level: selectedMentalState,
          notes: mentalStateNotes.trim() || undefined
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update mental state';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMentalState(data);
      setMessage({ type: 'success', content: 'Mental state updated successfully.' });
    } catch (error: any) {
      console.error('Mental state update error:', error);
      const errorMessage = error?.message || error?.toString() || 'An unknown error occurred';
      setMessage({ type: 'error', content: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentStateConfig = () => {
    if (!mentalState) return null;
    return mentalStateOptions.find(opt => opt.value === mentalState.level);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">Mental Health Manager</h1>
            <p className="text-muted-foreground font-comic">Update system mental state</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/dashboard" className="font-comic">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        {/* Current Mental State Display */}
        {mentalState && getCurrentStateConfig() && (
          <Card className={`border-2 ${getCurrentStateConfig()?.color}`}>
            <CardHeader>
              <CardTitle className="font-comic">Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{getCurrentStateConfig()?.icon}</span>
                <div>
                  <p className="font-comic font-bold text-xl">{getCurrentStateConfig()?.label}</p>
                  {mentalState.notes && (
                    <p className="text-sm text-muted-foreground font-comic mt-1">{mentalState.notes}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-comic">
                Last updated: {new Date(mentalState.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Update Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">Update Mental State</CardTitle>
            <CardDescription className="font-comic">Select a new mental state level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mental State Selection */}
            <div className="space-y-2">
              <Label htmlFor="mental-state-select" className="font-comic">Mental State Level</Label>
              <select
                id="mental-state-select"
                value={selectedMentalState}
                onChange={(e) => setSelectedMentalState(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 font-comic"
              >
                <option value="">-- Select mental state --</option>
                {mentalStateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="mental-state-notes" className="font-comic">Notes (optional)</Label>
              <textarea
                id="mental-state-notes"
                value={mentalStateNotes}
                onChange={(e) => setMentalStateNotes(e.target.value)}
                placeholder="Add any additional notes about the current mental state..."
                rows={3}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 font-comic resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleUpdateMentalState}
              disabled={saving || !selectedMentalState}
              className="w-full font-comic"
            >
              {saving ? 'Updating...' : 'Update Mental State'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentalHealthManager;