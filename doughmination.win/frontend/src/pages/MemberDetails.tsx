import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MemberStatus from '@/components/MemberStatus';
import useTheme from '@/hooks/useTheme';

interface Member {
  id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  pronouns?: string;
  description?: string;
  color?: string | null;
  tags?: string[];
  status?: {
    text: string;
    emoji?: string;
    updated_at: string;
  } | null;
}

interface MemberDetailsProps {
  members?: Member[];
  defaultAvatar?: string;
}

export default function MemberDetails({ members = [], defaultAvatar }: MemberDetailsProps) {
  const [theme] = useTheme();
  const { member_id } = useParams<{ member_id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper function to normalize color values from PluralKit
  const normalizeColor = (color: string | null | undefined): string | null => {
    if (!color) return null;
    // If it's already got a #, return as-is
    if (color.startsWith('#')) return color;
    // Add # prefix to hex colors from PluralKit
    return `#${color}`;
  };

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!member_id) {
        setError('No member ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching member data for:', member_id);
        
        // Fetch member basic info
        const response = await fetch(`/api/member/${member_id}`);
        if (!response.ok) {
          throw new Error('Member not found');
        }
        const memberData = await response.json();
        console.log('Member data received:', memberData);
        
        // Fetch member status separately
        try {
          const statusResponse = await fetch(`/api/members/${member_id}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('Status data received:', statusData);
            if (statusData.success && statusData.status) {
              memberData.status = statusData.status;
            }
          }
        } catch (statusErr) {
          console.log('No status found for member:', statusErr);
          // Not an error - member just doesn't have a status
        }
        
        setMember(memberData);
      } catch (err) {
        console.error('Error fetching member:', err);
        setError('Member not found or error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [member_id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="text-center font-comic">Loading member details...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Member not found'}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const memberColor = normalizeColor(member.color);
  const borderColor = memberColor || 'rgb(var(--primary))';

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 relative inline-block">
              {/* Status Bubble - Thought Bubble Style */}
              {member.status && (
                <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-20">
                  <div className="relative bg-card border-2 border-border rounded-[30px] px-4 py-2 shadow-lg max-w-[200px]">
                    <div className="flex items-center gap-2">
                      {member.status.emoji && <span className="text-lg">{member.status.emoji}</span>}
                      <span className="text-sm font-comic text-foreground truncate">{member.status.text}</span>
                    </div>
                    {/* Thought bubble circles - staggered diagonally toward avatar */}
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 translate-x-2">
                      <div className="w-3 h-3 bg-card border-2 border-border rounded-full shadow-md"></div>
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 translate-x-4">
                      <div className="w-2 h-2 bg-card border-2 border-border rounded-full shadow-md"></div>
                    </div>
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 translate-x-5">
                      <div className="w-1.5 h-1.5 bg-card border border-border rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              )}
              <img 
                src={member.avatar_url || defaultAvatar || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png'} 
                alt={member.display_name || member.name}
                className="w-32 h-32 rounded-full mx-auto object-cover border-[4px] transition-all"
                style={{
                  borderColor: borderColor,
                  boxShadow: `0 0 20px ${borderColor}40`
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
                }}
              />
            </div>
            <CardTitle 
              className="text-3xl font-comic transition-colors"
              style={{
                color: memberColor || 'rgb(var(--foreground))'
              }}
            >
              {member.display_name || member.name}
            </CardTitle>
            {member.pronouns && (
              <p 
                className="font-comic mt-1"
                style={{
                  color: memberColor ? `${memberColor}cc` : 'rgb(var(--muted-foreground))'
                }}
              >
                {member.pronouns}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {member.description && (
              <div>
                <h3 
                  className="text-lg font-comic mb-2 font-semibold"
                  style={{
                    color: memberColor || 'rgb(var(--foreground))'
                  }}
                >
                  About
                </h3>
                <p className="text-muted-foreground font-comic">
                  {member.description}
                </p>
              </div>
            )}

            {member.tags && member.tags.length > 0 && (
              <div>
                <h3 
                  className="text-lg font-comic mb-2 font-semibold"
                  style={{
                    color: memberColor || 'rgb(var(--foreground))'
                  }}
                >
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {member.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="font-comic"
                      style={memberColor ? {
                        backgroundColor: `${memberColor}20`,
                        borderColor: memberColor,
                        color: memberColor,
                        borderWidth: '1px'
                      } : undefined}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                asChild
                style={memberColor ? {
                  borderColor: memberColor,
                  color: memberColor
                } : undefined}
                className="hover:bg-opacity-10 transition-all"
              >
                <Link to="/" className="font-comic">
                  ← Back to Members
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}