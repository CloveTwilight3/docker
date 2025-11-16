import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import useTheme from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import MemberStatus from '@/components/MemberStatus';

// Define interfaces for type safety
interface Member {
  id: number;
  name: string;
  display_name?: string;
  avatar_url?: string;
  pronouns?: string;
  tags?: string[];
  is_private: boolean;
  is_cofront: boolean;
  is_special: boolean;
  original_name?: string;
  _isFromCofront?: boolean;
  _cofrontName?: string;
  _cofrontDisplayName?: string;
  component_avatars?: string[];
  component_members?: Member[];
  status?: {
    text: string;
    emoji?: string;
    updated_at: string;
  } | null;
}

interface Fronting {
  members: Member[];
}

interface SystemInfo {
  mental_state?: MentalState;
}

interface MentalState {
  level: string;
  notes?: string;
  updated_at: string;
}

interface UserData {
  username: string;
  display_name?: string;
}

export default function Index() {
  const [theme] = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [members, setMembers] = useState<Member[]>([]);
  const [fronting, setFronting] = useState<Fronting | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSubSystemFilter, setCurrentSubSystemFilter] = useState<string | null>(null);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Initialize app data
  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      // Check authentication status
      await checkAuthStatus();
      
      // Fetch public data
      await Promise.all([
        fetchMembers(),
        fetchFronting(),
        fetchSystemInfo()
      ]);
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoggedIn(false);
      setIsAdmin(false);
      setCurrentUser(null);
      return;
    }

    // Fast-path for mock dev token
    if (token.startsWith('mock-')) {
      setLoggedIn(true);
      setIsAdmin(token === 'mock-admin');
      setCurrentUser({ username: 'mock-user', display_name: 'Mock User' });
      return;
    }

    try {
      const response = await fetch("/api/is_admin", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLoggedIn(true);
        setIsAdmin(!!data.isAdmin);
        
        // Fetch user info
        const userResponse = await fetch("/api/user_info", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser({
            username: userData.username,
            display_name: userData.display_name
          });
        }
      } else {
        setLoggedIn(false);
        setIsAdmin(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setLoggedIn(false);
      setIsAdmin(false);
      setCurrentUser(null);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        
        // Sort members alphabetically by display name or name
        const sortedMembers = [...data].sort((a: Member, b: Member) => {
          const nameA = (a.display_name || a.name).toLowerCase();
          const nameB = (b.display_name || b.name).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setMembers(sortedMembers);
        
        // Extract unique tags
        const tags = new Set<string>();
        sortedMembers.forEach((member: Member) => {
          member.tags?.forEach(tag => tags.add(tag));
        });
        setAvailableTags(Array.from(tags));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchFronting = async () => {
    try {
      const response = await fetch("/api/fronters");
      if (response.ok) {
        const data = await response.json();
        setFronting(data);
      }
    } catch (error) {
      console.error('Error fetching fronting:', error);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch("/api/system");
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    navigate('/');
  };

  // Event handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleSubSystemFilterChange = useCallback((filter: string | null) => {
    setCurrentSubSystemFilter(filter);
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  // Filter members based on search and subsystem filter
  useEffect(() => {
    let filtered = members;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(member =>
        (member.display_name || member.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply subsystem filter
    if (currentSubSystemFilter) {
      if (currentSubSystemFilter === 'untagged') {
        filtered = filtered.filter(member => !member.tags || member.tags.length === 0);
      } else {
        filtered = filtered.filter(member => 
          member.tags?.includes(currentSubSystemFilter)
        );
      }
    }

    setFilteredMembers(filtered);
  }, [members, searchQuery, currentSubSystemFilter]);

  // Check if a member is currently fronting
  const isMemberFronting = useCallback((memberId: number, memberName: string): boolean => {
    if (!fronting?.members || fronting.members.length === 0) {
      return false;
    }

    // Check direct fronting
    if (fronting.members.some(m => m.id === memberId || m.name === memberName)) {
      return true;
    }

    // Check if member is part of a cofront
    return fronting.members.some(m => 
      m.is_cofront && 
      m.component_members?.some(cm => cm.id === memberId || cm.name === memberName)
    );
  }, [fronting]);

  // Mental state helper functions
  const getMentalStateLabel = (level: string) => {
    const labels: { [key: string]: string } = {
      'safe': 'Safe',
      'unstable': 'Unstable',
      'idealizing': 'Idealizing',
      'self-harming': 'Self-Harming',
      'highly at risk': 'Highly At Risk'
    };
    return labels[level] || level;
  };

  const getMentalStateIcon = (level: string) => {
    const icons: { [key: string]: string } = {
      'safe': '✅',
      'unstable': '⚠️',
      'idealizing': '❗',
      'self-harming': '🚨',
      'highly at risk': '⛔'
    };
    return icons[level] || '❓';
  };

  /**
   * Expands cofront members into their individual component members for display
   */
  const expandFrontingMembers = (frontingMembers: Member[]) => {
    if (!frontingMembers || !Array.isArray(frontingMembers)) {
      return [];
    }

    const expandedMembers: Member[] = [];

    frontingMembers.forEach(member => {
      if (member.is_cofront && member.component_members && member.component_members.length > 0) {
        // This is a cofront - expand it into individual component members
        member.component_members.forEach(componentMember => {
          expandedMembers.push({
            ...componentMember,
            _isFromCofront: true,
            _cofrontName: member.name,
            _cofrontDisplayName: member.display_name || member.name
          });
        });
      } else {
        // Regular member - add as-is
        expandedMembers.push(member);
      }
    });

    return expandedMembers;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-comic text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground theme-transition">
      {/* Header with navigation */}
      <header className="fixed top-0 left-0 w-full z-40 bg-card/90 backdrop-blur-sm border-b border-border theme-transition">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link 
            to="/" 
            className="text-2xl font-bold font-comic text-primary hover:text-primary/80 transition-colors"
          >
            Doughmination System®
          </Link>
          
          {/* Desktop Navigation */}
          <div className="desktop-nav hidden md:flex items-center gap-3">
            {loggedIn && currentUser && (
              <div className="text-sm font-comic text-muted-foreground mr-2">
                Logged in as: <span className="text-foreground font-semibold">{currentUser.display_name || currentUser.username}</span>
              </div>
            )}
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://www.butterfly-network.win"
                target="_blank"
                rel="noopener noreferrer"
                className="font-comic"
              >
                Butterfly Network
              </a>
            </Button>
            {loggedIn ? (
              <>
                {isAdmin && (
                  <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/dashboard" className="font-comic">
                      Admin Panel
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/status" className="font-comic">
                      Status Manager
                    </Link>
                  </Button>
                  </>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/user" className="font-comic">
                    Profile
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleLogout} className="font-comic">
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/login" className="font-comic">
                  Login
                </Link>
              </Button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="flex md:hidden items-center justify-center p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation overlay */}
        {menuOpen && (
          <div className="mobile-menu-overlay fixed inset-0 z-30 bg-black/50 md:hidden" onClick={toggleMenu}>
            <div 
              className="absolute right-0 top-[61px] w-64 max-w-[80vw] h-screen shadow-lg bg-card/95 backdrop-blur-sm border-l border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="flex flex-col p-4 gap-3">
                {loggedIn && currentUser && (
                  <li className="px-4 py-2 text-sm font-comic text-muted-foreground border-b border-border">
                    Logged in as: <span className="text-foreground font-semibold block mt-1">{currentUser.display_name || currentUser.username}</span>
                  </li>
                )}
                <li>
                  <a
                    href="https://www.butterfly-network.win"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-3 rounded-lg text-sm text-center transition-all font-comic bg-primary text-primary-foreground hover:bg-primary/80"
                    onClick={toggleMenu}
                  >
                    Butterfly Network
                  </a>
                </li>
                {loggedIn ? (
                  <>
                    {isAdmin && (
                      <li>
                        <Link 
                          to="/admin/dashboard"
                          className="block w-full px-4 py-3 rounded-lg text-sm text-center transition-all font-comic bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={toggleMenu}
                        >
                          Admin Panel
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link 
                        to="/admin/user"
                        className="block w-full px-4 py-3 rounded-lg text-sm text-center transition-all font-comic bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={toggleMenu}
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          handleLogout();
                          toggleMenu();
                        }}
                        className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg text-sm text-center hover:bg-destructive/80 transition-colors font-comic"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link 
                      to="/admin/login"
                      className="block w-full px-4 py-3 rounded-lg text-sm text-center transition-all font-comic bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={toggleMenu}
                    >
                      Login
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </header>

      {/* Space for fixed header */}
      <div className="h-20"></div>

      {/* Main content */}
      <main className="container mx-auto px-2 sm:px-4 pt-4 flex-grow">
        <div className="flex">
          <div className="flex-1">
            <div className="content-wrapper flex flex-col gap-2 sm:gap-4">
              <div className="mt-2">
                <h1 className="text-4xl font-bold mb-8 text-center font-comic text-primary">
                  System Members
                </h1> 
                
                {/* Mental State Banner */}
                {systemInfo?.mental_state && (
                  <div className={`mental-state-banner ${systemInfo.mental_state.level.replace(' ', '-')} mb-6 p-4 rounded-lg`}>
                    <div className="flex items-center justify-center gap-3">
                      <span className="mental-state-icon text-2xl">
                        {getMentalStateIcon(systemInfo.mental_state.level)}
                      </span>
                      <div>
                        <span className="mental-state-label font-comic">Current Status: </span>
                        <span className="mental-state-level font-comic font-bold">
                          {getMentalStateLabel(systemInfo.mental_state.level)}
                        </span>
                        {systemInfo.mental_state.notes && (
                          <p className="mental-state-notes mt-2 font-comic text-sm opacity-80">
                            {systemInfo.mental_state.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <small className="mental-state-updated block mt-2 opacity-75 text-center font-comic">
                      Last updated: {new Date(systemInfo.mental_state.updated_at).toLocaleString()}
                    </small>
                  </div>
                )}
                
                {/* Currently Fronting Section */}
                {fronting && fronting.members && fronting.members.length > 0 && (
                  <div className="mb-6 p-4 border-b border-border">
                    {(() => {
                      const expandedMembers = expandFrontingMembers(fronting.members);
                      
                      return (
                        <>
                          <h2 className="text-xl font-comic mb-3 text-center">
                            Currently {expandedMembers.length > 1 ? 'Co-fronting' : 'Fronting'}
                          </h2>
                          <div className="flex flex-wrap gap-4 justify-center">
                            {expandedMembers.map((member, index) => (
                              <div key={member.id || `${member.name}-${index}`} className="flex flex-col items-center relative">
                                {/* Status Bubble - Thought Bubble Style */}
                                {member.status && (
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
                                    <div className="relative bg-card border-2 border-border rounded-2xl px-3 py-1.5 shadow-lg max-w-[140px]">
                                      <div className="flex items-center gap-1.5">
                                        {member.status.emoji && <span className="text-sm">{member.status.emoji}</span>}
                                        <span className="text-xs font-comic text-foreground truncate">{member.status.text}</span>
                                      </div>
                                      {/* Thought bubble circles */}
                                      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                                        <div className="w-2 h-2 bg-card border border-border rounded-full"></div>
                                        <div className="w-1.5 h-1.5 bg-card border border-border rounded-full"></div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <Link to={`/${member.name}`}>
                                  <div className="relative">
                                    <img
                                      src={member.avatar_url || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png'}
                                      alt={member.display_name || member.name}
                                      className="w-16 h-16 rounded-full object-cover border-2 border-border hover:border-primary transition-colors cursor-pointer"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
                                      }}
                                    />
                                  </div>
                                </Link>
                                <div className="mt-2 text-center max-w-[120px]">
                                  <Link 
                                    to={`/${member.name}`}
                                    className="font-comic font-semibold text-sm text-primary hover:text-primary/80 transition-colors block"
                                  >
                                    {member.display_name || member.name || "Unknown"}
                                  </Link>
                                  
                                  {member.tags && member.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                      {member.tags.map((tag, tagIndex) => (
                                        <span
                                          key={tagIndex}
                                          className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-comic"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {member._isFromCofront && (
                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-comic">
                                      {member._cofrontDisplayName}
                                    </span>
                                  )}
                                  
                                  {member.is_special && (
                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white font-comic">
                                      {member.original_name === "system" ? "Unsure" : "Sleeping"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {fronting.members.some(m => m.is_cofront) && (
                            <div className="mt-3 text-sm text-muted-foreground text-center font-comic">
                              {fronting.members
                                .filter(m => m.is_cofront)
                                .map(cofront => `${cofront.display_name || cofront.name} (${cofront.component_members?.length || 0} members)`)
                                .join(', ')} currently co-fronting
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {/* Search and Filter */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => handleSubSystemFilterChange(null)}
                      className={`filter-button ${currentSubSystemFilter === null ? 'active' : ''}`}
                    >
                      All Members
                    </button>
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleSubSystemFilterChange(tag)}
                        className={`filter-button ${currentSubSystemFilter === tag ? 'active' : ''}`}
                      >
                        {tag}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSubSystemFilterChange('untagged')}
                      className={`filter-button ${currentSubSystemFilter === 'untagged' ? 'active' : ''}`}
                    >
                      Untagged
                    </button>
                  </div>
                  
                  <div className="search-container">
                    <div className="relative">
                      <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="search-input"
                      />
                      {searchQuery && (
                        <button 
                          onClick={clearSearch}
                          className="search-clear"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Members Grid */}
                {filteredMembers.length > 0 ? (
                  <div className="member-grid" style={{ paddingTop: '3rem' }}>
                    {filteredMembers
                      .filter(member => !member.is_private && !member.is_cofront && !member.is_special)
                      .map((member) => {
                        const isFronting = isMemberFronting(member.id, member.name);
                        return (
                          <div key={member.id} className={`member-grid-item ${isFronting ? 'fronting-glow' : ''} relative`}>
                            {/* Status Bubble - Thought Bubble Style */}
                            {member.status && (
                              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-20">
                                <div className="relative bg-card border-2 border-border rounded-2xl px-3 py-1.5 shadow-lg max-w-[130px]">
                                  <div className="flex items-center gap-1.5">
                                    {member.status.emoji && <span className="text-sm">{member.status.emoji}</span>}
                                    <span className="text-xs font-comic text-foreground truncate">{member.status.text}</span>
                                  </div>
                                  {/* Thought bubble circles */}
                                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                                    <div className="w-2 h-2 bg-card border border-border rounded-full"></div>
                                    <div className="w-1.5 h-1.5 bg-card border border-border rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <Link to={`/${member.name}`}>
                              <div className="text-center">
                                <div className="relative inline-block">
                                  <img 
                                    src={member.avatar_url || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png'} 
                                    alt={member.display_name || member.name}
                                    className="w-16 h-16 mx-auto rounded-full object-cover mb-2 border-2 border-border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
                                    }}
                                  />
                                </div>
                                <h3 className="font-comic font-semibold text-sm text-card-foreground">
                                  {member.display_name || member.name}
                                </h3>
                                {member.pronouns && (
                                  <p className="text-xs text-muted-foreground mt-1 font-comic">
                                    {member.pronouns}
                                  </p>
                                )}
                                
                                {member.tags && member.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                                    {member.tags.slice(0, 2).map((tag, index) => (
                                      <span
                                        key={index}
                                        className="text-xs px-2 py-1 rounded-full font-comic bg-secondary text-secondary-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {member.tags.length > 2 && (
                                      <span className="text-xs text-muted-foreground font-comic">
                                        +{member.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="font-comic text-lg text-muted-foreground">
                      {searchQuery || currentSubSystemFilter 
                        ? 'No members found matching your criteria.' 
                        : 'No members available.'
                      }
                    </p>
                    {(searchQuery || currentSubSystemFilter) && (
                      <div className="mt-4 flex gap-2 justify-center">
                        {searchQuery && (
                          <Button variant="secondary" size="sm" onClick={clearSearch} className="font-comic">
                            Clear search
                          </Button>
                        )}
                        {currentSubSystemFilter && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setCurrentSubSystemFilter(null)}
                            className="font-comic"
                          >
                            Clear filter
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="github-footer">
        <a
          href="https://github.com/The-Butterfly-Network/docker"
          target="_blank"
          rel="noopener noreferrer"
          className="github-button"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
          </svg>
          View on GitHub
        </a>
        <p className="mt-4 text-sm text-muted-foreground font-comic">
          Doughmination System® is a trade mark in the United Kingdom under trademark number{' '}
          <a 
            href="https://www.ipo.gov.uk/t-tmj.htm/t-tmj/tm-journals/2025-039/UK00004263144.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            UK00004263144
          </a>
        </p>
      </footer>
    </div>
  );
}