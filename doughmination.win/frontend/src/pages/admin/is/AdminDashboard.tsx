// AdminDashboard.tsx - Enhanced with mental state management and back button
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useTheme from '@/hooks/useTheme';

interface Member {
  id: string;
  uuid: string;
  name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  pronouns?: string | null;
  tags?: string[];
  is_special?: boolean;
  original_name?: string;
  privacy?: {
    visibility: string;
  };
}

interface FrontingData {
  id: string;
  timestamp: string;
  members: Member[];
}

interface MentalState {
  level: string;
  notes?: string;
  updated_at: string;
}

interface AdminDashboardProps {
  fronting: FrontingData | null;
  onFrontingChanged: (memberId?: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ fronting, onFrontingChanged }) => {
  const [theme] = useTheme();
  const [newFront, setNewFront] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', content: string} | null>(null);
  
  // Mental state management
  const [mentalState, setMentalState] = useState<MentalState | null>(null);
  const [selectedMentalState, setSelectedMentalState] = useState("");
  const [mentalStateNotes, setMentalStateNotes] = useState("");
  const [mentalStateLoading, setMentalStateLoading] = useState(false);

  const mentalStateOptions = [
    { value: 'safe', label: 'Safe', icon: '✅' },
    { value: 'unstable', label: 'Unstable', icon: '⚠️' },
    { value: 'idealizing', label: 'Idealizing', icon: '❗' },
    { value: 'self-harming', label: 'Self-Harming', icon: '🚨' },
    { value: 'highly at risk', label: 'Highly At Risk', icon: '⛔' }
  ];

  // Fetch members and mental state on component mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchMembers(),
        fetchMentalState()
      ]);
    };
    fetchData();
  }, []);

  // Set the current fronter as default selection when fronting data changes
  useEffect(() => {
    if (fronting?.members && fronting.members.length > 0 && members.length > 0) {
      const currentFronter = fronting.members[0];
      if (!newFront || newFront !== currentFronter.id) {
        setNewFront(currentFronter.id);
      }
    }
  }, [fronting, members]);

  const fetchMembers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const res = await fetch("/api/members", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      
      // Sort members alphabetically by display name or name
      const sortedMembers = [...data].sort((a, b) => {
        const nameA = (a.display_name || a.name).toLowerCase();
        const nameB = (b.display_name || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setMembers(sortedMembers);
    } catch (err) {
      console.error("Error fetching members:", err);
      setMessage({ type: "error", content: "Error loading members" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMentalState = async () => {
    try {
      const res = await fetch("/api/mental-state");
      if (res.ok) {
        const data = await res.json();
        setMentalState(data);
        setSelectedMentalState(data.level);
        setMentalStateNotes(data.notes || "");
      }
    } catch (err) {
      console.error("Error fetching mental state:", err);
    }
  };

  // Handle switching fronting member
  const handleSwitchFront = async () => {
    if (!newFront) {
      console.error('No member selected for switching');
      setMessage({ type: "error", content: "Please select a member to switch to." });
      return;
    }
    
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({ type: "error", content: "Authentication required." });
      return;
    }

    setMessage(null);
    setLoading(true);
    
    const requestBody = { member_id: newFront };
    
    try {
      const response = await fetch("/api/switch_front", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (data.success || data.status === 'success') {
        setMessage({ type: "success", content: "Fronting member switched successfully." });
        
        if (onFrontingChanged) {
          onFrontingChanged(newFront);
        }
      } else {
        setMessage({ 
          type: "error", 
          content: data.message || data.detail || "Failed to switch fronting member." 
        });
      }
    } catch (error: any) {
      console.error("=== SWITCH ERROR ===", error);
      const errorMessage = error?.message || error?.toString() || "An unknown error occurred";
      setMessage({ type: "error", content: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle updating mental state
  const handleUpdateMentalState = async () => {
    if (!selectedMentalState) {
      setMessage({ type: "error", content: "Please select a mental state level." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({ type: "error", content: "Authentication required." });
      return;
    }

    setMessage(null);
    setMentalStateLoading(true);

    try {
      const response = await fetch("/api/mental-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          level: selectedMentalState,
          notes: mentalStateNotes.trim() || undefined
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update mental state";
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
      setMessage({ type: "success", content: "Mental state updated successfully." });
    } catch (error: any) {
      console.error("Mental state update error:", error);
      const errorMessage = error?.message || error?.toString() || "An unknown error occurred";
      setMessage({ type: "error", content: errorMessage });
    } finally {
      setMentalStateLoading(false);
    }
  };

  // Get member display name
  const getMemberDisplayName = (member: Member) => {
    if (member.is_special) {
      return `${member.display_name || member.name} (${member.original_name === "system" ? "Unsure" : "Sleeping"})`;
    }
    return member.display_name || member.name;
  };

  // Filter members for dropdown
  const availableMembers = members.filter(member => 
    member.privacy?.visibility !== 'private' || member.is_special
  );

  // Check if the selected member is already the current fronter
  const isCurrentFronter = () => {
    if (!fronting?.members || fronting.members.length === 0 || !newFront) {
      return false;
    }
    return fronting.members[0].id === newFront;
  };

  if (loading && members.length === 0) {
    return <div className="text-center p-8 font-comic">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-comic">Admin Dashboard</h1>
        <Link 
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-comic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
      
      {/* Display feedback messages */}
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === "success" 
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
        }`}>
          {message.content}
        </div>
      )}

      {/* Mental State Management Section */}
      <div className="mb-8 p-4 border rounded-lg dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 font-comic">Mental State Management</h2>
        
        {/* Current Mental State Display */}
        {mentalState && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {mentalStateOptions.find(opt => opt.value === mentalState.level)?.icon || '❓'}
              </span>
              <div>
                <span className="font-semibold font-comic">Current Status: </span>
                <span className="font-bold font-comic">
                  {mentalStateOptions.find(opt => opt.value === mentalState.level)?.label || mentalState.level}
                </span>
              </div>
            </div>
            {mentalState.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-comic">
                Notes: {mentalState.notes}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 font-comic">
              Last updated: {new Date(mentalState.updated_at).toLocaleString()}
            </p>
          </div>
        )}

        {/* Mental State Update Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="mental-state-select" className="block text-sm font-medium mb-2 font-comic">
              Update Mental State:
            </label>
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

          <div>
            <label htmlFor="mental-state-notes" className="block text-sm font-medium mb-2 font-comic">
              Notes (optional):
            </label>
            <textarea
              id="mental-state-notes"
              value={mentalStateNotes}
              onChange={(e) => setMentalStateNotes(e.target.value)}
              placeholder="Add any additional notes about the current mental state..."
              rows={3}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 font-comic"
            />
          </div>

          <button
            onClick={handleUpdateMentalState}
            disabled={mentalStateLoading || !selectedMentalState}
            className="w-full py-2 px-4 bg-purple-600 disabled:bg-purple-300 text-white rounded-md transition-colors hover:bg-purple-700 font-comic"
          >
            {mentalStateLoading ? "Updating..." : "Update Mental State"}
          </button>
        </div>
      </div>

      {/* Current Fronting Display */}
      {fronting && fronting.members && fronting.members.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-center font-comic">
            Currently Fronting{fronting.members.length > 1 ? ` (${fronting.members.length})` : ""}:
          </h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            {fronting.members.map((member) => (
              <div key={member.id} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500 mb-2">
                  <img
                    src={member.avatar_url || "https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png"}
                    alt={member.display_name || member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png";
                    }}
                  />
                </div>
                <span className="text-center font-semibold font-comic">
                  {member.display_name || member.name}
                </span>
                {member.pronouns && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-comic">
                    {member.pronouns}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center font-comic">
            Last switch: {new Date(fronting.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Switch Fronting Member Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 font-comic">Switch Fronting Member</h2>
        <div className="space-y-4">
          <div className="flex flex-col space-y-3">
            <label htmlFor="member-select" className="block text-sm font-medium font-comic">
              Select new fronting member:
            </label>
            
            <select 
              id="member-select"
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 font-comic"
            >
              <option value="">-- Select a member --</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberDisplayName(member)} (ID: {member.id})
                </option>
              ))}
            </select>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500 p-2 bg-gray-100 dark:bg-gray-800 rounded font-comic">
              <div>Selected: {newFront || 'None'}</div>
              <div>Available members: {availableMembers.length}</div>
              <div>
                Current fronter: {
                  fronting?.members && fronting.members.length > 0 
                    ? `${fronting.members[0].display_name || fronting.members[0].name} (ID: ${fronting.members[0].id})`
                    : 'None'
                }
              </div>
            </div>
            
            <button 
              onClick={handleSwitchFront}
              disabled={loading || !newFront || availableMembers.length === 0 || isCurrentFronter()}
              className="w-full py-2 px-4 bg-blue-600 disabled:bg-blue-300 text-white rounded-md transition-colors font-comic"
            >
              {loading ? "Switching..." : isCurrentFronter() ? "Already Fronting" : "Switch Front"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;