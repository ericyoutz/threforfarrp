'use client';

import { useMemo, useState } from 'react';

export default function DashboardClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState('workspace');
  const [search, setSearch] = useState('');
  const [selectedChatId, setSelectedChatId] = useState(initialData.chats[0]?.id || null);
  const [messageInput, setMessageInput] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [memberSelection, setMemberSelection] = useState(() => data.users.filter((user) => user.role !== 'ADMIN').slice(0, 2).map((user) => user.id));
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = data.currentUser.role === 'ADMIN';

  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.chats.filter((chat) => chat.title.toLowerCase().includes(query));
  }, [data.chats, search]);

  const selectedChat = visibleChats.find((chat) => chat.id === selectedChatId) || visibleChats[0] || null;

  async function handleApi(url, body = {}) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Something went wrong.');
        return null;
      }
      if (result.data) {
        setData(result.data);
        if (result.data.chats.length && !result.data.chats.some((chat) => chat.id === selectedChatId)) {
          setSelectedChatId(result.data.chats[0].id);
        }
      }
      return result;
    } catch {
      setError('Something went wrong.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!selectedChat || !messageInput.trim()) return;
    const result = await handleApi('/api/messages', { chatId: selectedChat.id, message: messageInput });
    if (result) {
      setMessageInput('');
    }
  }

  async function createChat() {
    if (!newChatTitle.trim()) return;
    const result = await handleApi('/api/chats', {
      title: newChatTitle,
      description: newChatDescription,
      memberIds: memberSelection
    });
    if (result) {
      setNewChatTitle('');
      setNewChatDescription('');
      setMemberSelection(result.data.users.filter((user) => user.role !== 'ADMIN').slice(0, 2).map((user) => user.id));
      setSelectedChatId(result.data.chats[0]?.id || null);
      setTab('workspace');
    }
  }

  async function approveUser(requestId) {
    await handleApi('/api/admin/approve', { requestId });
  }

  async function toggleChatMember(chatId, userId) {
    await handleApi('/api/admin/chat-members', { chatId, userId });
  }

  async function publishAnnouncement() {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    const result = await handleApi('/api/announcements', { title: announcementTitle, body: announcementBody });
    if (result) {
      setAnnouncementTitle('');
      setAnnouncementBody('');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const currentProfile = data.currentUser.profile;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="pill">Private Roleplay Writing Platform</div>
          <h1>Threforfar</h1>
          <p>Admin-controlled collaborative writing with saved shared data.</p>
        </div>
        <div className="row top-actions">
          <button type="button" className="btn-soft" onClick={() => window.location.reload()}>Refresh</button>
          <button type="button" className="btn-primary" onClick={logout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        {['workspace', 'admin', 'about'].map((value) => (
          <button
            key={value}
            type="button"
            className={`tab ${tab === value ? 'btn-primary active' : ''}`}
            onClick={() => setTab(value)}
          >
            {value === 'workspace' ? 'Workspace' : value === 'admin' ? 'Admin' : 'About'}
          </button>
        ))}
      </div>

      {error ? <div className="notice">{error}</div> : null}
      {busy ? <div className="success">Saving changes...</div> : null}

      <div className={`layout ${tab !== 'workspace' ? 'hidden' : ''}`}>
        <section className="card">
          <div className="card-header">
            <h2>Users</h2>
            <p>Approved members of the shared writing platform.</p>
          </div>
          <div className="card-body">
            <div className="user-switch">
              {data.users.map((user) => (
                <div key={user.id} className={`user-item ${user.id === data.currentUser.id ? 'active' : ''}`}>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  <div className="small">{user.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>{selectedChat ? selectedChat.title : 'Chats'}</h2>
            <p>{selectedChat ? selectedChat.description || 'Private room' : 'Only assigned rooms appear here.'}</p>
          </div>
          <div className="card-body">
            <div className="search">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" />
            </div>
            <div className="chat-grid">
              <div id="chatList" className="chat-list">
                {visibleChats.length ? visibleChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <div style={{ fontWeight: 600 }}>{chat.title}</div>
                    <div className="small">{chat.description}</div>
                  </button>
                )) : (
                  <div className="announce-item"><p>No chats are assigned to this account.</p></div>
                )}
              </div>
              <div>
                <div className="chip-row">
                  {selectedChat?.members.map((memberId) => {
                    const user = data.users.find((entry) => entry.id === memberId);
                    return <div key={memberId} className="member-chip">{user?.name || 'Unknown'}</div>;
                  })}
                </div>
                <div className="chat-room">
                  {selectedChat ? selectedChat.messages.map((message) => {
                    const sender = data.users.find((entry) => entry.id === message.senderId);
                    return (
                      <div key={message.id} className="bubble">
                        <div className="meta"><span>{sender?.name || 'Unknown'}</span><span>{message.time}</span></div>
                        <div>{message.text}</div>
                      </div>
                    );
                  }) : <div className="announce-item"><p>Select a room.</p></div>}
                </div>
                <div className="composer">
                  <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Write in this private thread..." />
                  <button type="button" className="btn-primary" onClick={sendMessage}>Send</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Community Panel</h2>
            <p>Announcements, profile, and access rules.</p>
          </div>
          <div className="card-body subgrid">
            <div className="panel-section">
              <h3>Announcements</h3>
              <div>
                {data.announcements.map((announcement) => (
                  <div key={announcement.id} className="announce-item">
                    <div className="meta"><strong className="meta-strong">{announcement.title}</strong><span>{announcement.time}</span></div>
                    <p>{announcement.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-section">
              <h3>Character Profile</h3>
              <div className="profile-box">
                {currentProfile ? (
                  <>
                    <div><strong>Character:</strong> {currentProfile.character || 'Not set'}</div>
                    <div className="mt-8"><strong>Faction:</strong> {currentProfile.faction || 'Not set'}</div>
                    <div className="mt-8"><strong>Writing style:</strong> {currentProfile.style || 'Not set'}</div>
                  </>
                ) : (
                  <div className="muted">Admin account does not use a character profile.</div>
                )}
              </div>
            </div>
            <div className="panel-section">
              <h3>Access Rules</h3>
              <div className="announce-item"><p>Users only see chats assigned to them.</p></div>
              <div className="announce-item"><p>The administrator creates rooms, approves users, and controls membership.</p></div>
              <div className="announce-item"><p>This version uses a real database so all approved users see the same saved data.</p></div>
            </div>
          </div>
        </section>
      </div>

      <div className={`layout ${tab !== 'admin' ? 'hidden' : ''}`}>
        <section className="card">
          <div className="card-header">
            <h2>Create Room</h2>
            <p>Admin-only controls.</p>
          </div>
          <div className="card-body stack">
            {!isAdmin ? <div className="notice">You are not signed in as the administrator. Admin controls are locked.</div> : null}
            <div>
              <label>Room title</label>
              <input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} placeholder="Enter private thread name" disabled={!isAdmin} />
            </div>
            <div>
              <label>Description</label>
              <input value={newChatDescription} onChange={(e) => setNewChatDescription(e.target.value)} placeholder="Short description" disabled={!isAdmin} />
            </div>
            <div>
              <label>Assign members</label>
              <div className="stack">
                {data.users.filter((user) => user.id !== data.currentUser.id || data.currentUser.role !== 'ADMIN').filter((user) => user.role !== 'ADMIN').map((user) => {
                  const active = memberSelection.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`member-pick ${active ? 'active' : ''}`}
                      disabled={!isAdmin}
                      onClick={() => {
                        setMemberSelection((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]);
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div className="small">{user.role}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" className="btn-primary btn-full" onClick={createChat} disabled={!isAdmin}>Create Private Chat</button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Admin Tools</h2>
            <p>Account approvals, announcements, and room membership.</p>
          </div>
          <div className="card-body subgrid">
            <div className="panel-section">
              <h3>Pending Account Requests</h3>
              <div>
                {data.pendingUsers.length ? data.pendingUsers.map((request) => (
                  <div key={request.id} className="request-item">
                    <div style={{ fontWeight: 600 }}>{request.name}</div>
                    <div className="small">{request.email}</div>
                    <div className="row mt-10">
                      <button type="button" className="btn-primary" onClick={() => approveUser(request.id)} disabled={!isAdmin}>Approve writer</button>
                    </div>
                  </div>
                )) : <div className="announce-item"><p>No pending requests.</p></div>}
              </div>
            </div>

            <div className="panel-section">
              <h3>Publish Announcement</h3>
              <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="Announcement title" disabled={!isAdmin} />
              <textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="Announcement text" disabled={!isAdmin} />
              <button type="button" className="btn-primary" onClick={publishAnnouncement} disabled={!isAdmin}>Publish Announcement</button>
            </div>

            <div className="panel-section">
              <h3>Manage Room Membership</h3>
              <div>
                {data.chats.map((chat) => (
                  <div key={chat.id} className="announce-item">
                    <h4>{chat.title}</h4>
                    <p>{chat.description}</p>
                    <div className="chip-row mt-10">
                      {chat.members.map((memberId) => {
                        const user = data.users.find((entry) => entry.id === memberId);
                        return <div key={memberId} className="member-chip">{user?.name || 'Unknown'}</div>;
                      })}
                    </div>
                    <div className="mt-10 wrap-buttons">
                      {data.users.filter((user) => user.role !== 'ADMIN').map((user) => {
                        const active = chat.members.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            className={active ? 'btn-primary' : ''}
                            disabled={!isAdmin}
                            onClick={() => toggleChatMember(chat.id, user.id)}
                          >
                            {user.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>What this version adds</h2>
            <p>Same UI, real shared persistence.</p>
          </div>
          <div className="card-body subgrid">
            <div className="announce-item"><p>Users, rooms, messages, and announcements are stored in Postgres.</p></div>
            <div className="announce-item"><p>Login is real. Passwords are hashed before storage.</p></div>
            <div className="announce-item"><p>Anyone can request access. Only the admin can approve them.</p></div>
            <div className="announce-item"><p>Room visibility is enforced by server-side membership checks.</p></div>
          </div>
        </section>
      </div>

      <div className={`card ${tab !== 'about' ? 'hidden' : ''}`}>
        <div className="card-header">
          <h2>About this version</h2>
          <p>The same demo layout, converted into a real shared web app for Vercel.</p>
        </div>
        <div className="card-body subgrid">
          <div className="announce-item"><h4>Platform</h4><p>Built for Next.js on Vercel with Postgres.</p></div>
          <div className="announce-item"><h4>Authentication</h4><p>Session cookies and hashed passwords.</p></div>
          <div className="announce-item"><h4>Persistence</h4><p>All users share one saved database instead of browser-only local storage.</p></div>
          <div className="announce-item"><h4>Workflow</h4><p>Same screens and overall flow as the demo: login, request access, admin approvals, private rooms, announcements, and profiles.</p></div>
        </div>
      </div>
    </div>
  );
}
