import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import useTheme from '@/hooks/useTheme';

interface MemberMetric {
  id: string;
  name: string;
  display_name: string;
  avatar_url?: string;
  total_seconds: number;
  total_percent: number;
  '24h': number;
  '48h': number;
  '5d': number;
  '7d': number;
  '30d': number;
}

interface FrontingMetrics {
  total_time: number;
  members: Record<string, MemberMetric>;
  timeframes: Record<string, Record<string, number>>;
}

interface SwitchMetrics {
  total_switches: number;
  avg_switches_per_day: number;
  timeframes: {
    '24h': number;
    '48h': number;
    '5d': number;
    '7d': number;
    '30d': number;
  };
}

const COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#a855f7', '#06b6d4', '#eab308', '#22c55e', '#f43f5e'
];

const Metrics: React.FC = () => {
  const [theme] = useTheme();
  const [frontingMetrics, setFrontingMetrics] = useState<FrontingMetrics | null>(null);
  const [switchMetrics, setSwitchMetrics] = useState<SwitchMetrics | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  const timeframeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '48h', label: 'Last 48 Hours' },
    { value: '5d', label: 'Last 5 Days' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      setLoading(false);
      return;
    }

    try {
      const [frontingRes, switchRes] = await Promise.all([
        fetch('/api/metrics/fronting-time?days=30', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/metrics/switch-frequency?days=30', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (frontingRes.ok && switchRes.ok) {
        const frontingData = await frontingRes.json();
        const switchData = await switchRes.json();
        setFrontingMetrics(frontingData);
        setSwitchMetrics(switchData);
      } else {
        setMessage({ type: 'error', content: 'Failed to fetch metrics' });
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setMessage({ type: 'error', content: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getPieChartData = () => {
    if (!frontingMetrics) return [];

    const timeframeKey = selectedTimeframe as keyof MemberMetric;
    const members = Object.values(frontingMetrics.members);

    // Filter members with fronting time in the selected timeframe
    const filteredMembers = members
      .filter(m => m[timeframeKey] > 0)
      .sort((a, b) => b[timeframeKey] - a[timeframeKey])
      .slice(0, 10); // Top 10 members

    return filteredMembers.map(member => ({
      name: member.display_name || member.name,
      value: member[timeframeKey],
      seconds: member[timeframeKey]
    }));
  };

  const getBarChartData = () => {
    if (!switchMetrics) return [];

    return [
      { timeframe: '24h', switches: switchMetrics.timeframes['24h'] },
      { timeframe: '48h', switches: switchMetrics.timeframes['48h'] },
      { timeframe: '5d', switches: switchMetrics.timeframes['5d'] },
      { timeframe: '7d', switches: switchMetrics.timeframes['7d'] },
      { timeframe: '30d', switches: switchMetrics.timeframes['30d'] }
    ];
  };

  const getTopFronters = () => {
    if (!frontingMetrics) return [];

    const timeframeKey = selectedTimeframe as keyof MemberMetric;
    const members = Object.values(frontingMetrics.members);

    return members
      .filter(m => m[timeframeKey] > 0)
      .sort((a, b) => b[timeframeKey] - a[timeframeKey])
      .slice(0, 10);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-comic font-semibold">{payload[0].name}</p>
          <p className="font-comic text-sm text-muted-foreground">
            {formatDuration(payload[0].payload.seconds)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="text-center font-comic">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">Metrics</h1>
            <p className="text-muted-foreground font-comic">System fronting and switching statistics</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/" className="font-comic">Back to Home</Link>
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        {/* Timeframe Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Label className="font-comic">Timeframe:</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-[200px] font-comic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="font-comic">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        {switchMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-comic">Total Switches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-comic">{switchMetrics.total_switches}</p>
                <p className="text-sm text-muted-foreground font-comic mt-1">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-comic">Avg per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-comic">
                  {switchMetrics.avg_switches_per_day.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground font-comic mt-1">
                  Switches per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-comic">Selected Period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-comic">
                  {switchMetrics.timeframes[selectedTimeframe as keyof typeof switchMetrics.timeframes]}
                </p>
                <p className="text-sm text-muted-foreground font-comic mt-1">
                  {timeframeOptions.find(o => o.value === selectedTimeframe)?.label}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pie Chart - Fronting Time Distribution */}
        {frontingMetrics && getPieChartData().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-comic">Fronting Time Distribution</CardTitle>
              <CardDescription className="font-comic">
                Top fronters for {timeframeOptions.find(o => o.value === selectedTimeframe)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getPieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar Chart - Switch Frequency */}
        {switchMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="font-comic">Switch Frequency Over Time</CardTitle>
              <CardDescription className="font-comic">
                Number of switches across different timeframes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getBarChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeframe" className="font-comic" />
                  <YAxis className="font-comic" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Bar dataKey="switches" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Fronters Table */}
        {frontingMetrics && getTopFronters().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-comic">Top Fronters</CardTitle>
              <CardDescription className="font-comic">
                Most active members for {timeframeOptions.find(o => o.value === selectedTimeframe)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTopFronters().map((member, index) => {
                  const timeframeKey = selectedTimeframe as keyof MemberMetric;
                  const duration = member[timeframeKey];
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold font-comic text-sm">
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <img
                        src={member.avatar_url || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png'}
                        alt={member.display_name || member.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
                        }}
                      />

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-comic font-semibold">{member.display_name || member.name}</p>
                        <p className="text-sm text-muted-foreground font-comic">
                          {formatDuration(duration)}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-32 hidden sm:block">
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${(duration / getTopFronters()[0][timeframeKey]) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {frontingMetrics && getPieChartData().length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground font-comic">
                No fronting data available for the selected timeframe
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

export default Metrics;