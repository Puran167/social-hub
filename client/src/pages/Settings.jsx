import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiLockClosed, HiEye, HiPaintBrush, HiBell, HiShieldCheck, HiCamera,
  HiDevicePhoneMobile, HiComputerDesktop, HiDeviceTablet, HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privacy, setPrivacy] = useState(user?.privacySettings || { profileVisibility: 'public', showOnlineStatus: true, allowFriendRequests: true });
  const [notifications, setNotifications] = useState({
    Messages: true, 'Friend Requests': true, Likes: true, Comments: true, 'Playlist Updates': true, 'AI Music': true,
  });
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await API.get('/sessions');
      setSessions(data);
    } catch (err) { /* ignore */ }
    setSessionsLoading(false);
  };

  const revokeSession = async (id) => {
    try {
      await API.delete(`/sessions/${id}`);
      setSessions(prev => prev.filter(s => s._id !== id));
      toast.success('Session revoked');
    } catch (err) { toast.error('Failed'); }
  };

  const revokeAllOther = async () => {
    try {
      await API.delete('/sessions');
      setSessions(prev => prev.filter(s => s.isCurrent));
      toast.success('All other sessions revoked');
    } catch (err) { toast.error('Failed'); }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return HiDevicePhoneMobile;
    if (type === 'tablet') return HiDeviceTablet;
    return HiComputerDesktop;
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: HiUser },
    { id: 'password', label: 'Password', icon: HiLockClosed },
    { id: 'privacy', label: 'Privacy', icon: HiEye },
    { id: 'appearance', label: 'Appearance', icon: HiPaintBrush },
    { id: 'notifications', label: 'Notifications', icon: HiBell },
    { id: 'sessions', label: 'Devices', icon: HiDevicePhoneMobile },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('bio', bio);
      if (avatarFile) form.append('profilePhoto', avatarFile);
      const { data } = await API.put('/auth/profile', form);
      updateUser(data);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await API.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    setSaving(false);
  };

  const handleUpdatePrivacy = async () => {
    setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', { privacySettings: privacy });
      updateUser(data);
      toast.success('Privacy settings updated!');
    } catch (err) { toast.error('Update failed'); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="md:w-56 flex-shrink-0">
          <div className="glass-card p-2 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeTab === tab.id ? 'bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-dark font-semibold' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/50 text-gray-500 dark:text-gray-400'
                }`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="card space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2"><HiUser className="w-5 h-5" /> Edit Profile</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarFile ? URL.createObjectURL(avatarFile) : user?.profilePhoto) ? (
                    <img src={avatarFile ? URL.createObjectURL(avatarFile) : user?.profilePhoto} alt=""
                      className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary dark:text-primary-dark text-2xl font-bold">
                      {user?.name?.[0]}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80">
                    <HiCamera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files[0])} />
                  </label>
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} className="input-field w-full" rows={3}
                  placeholder="Tell us about yourself..." />
              </div>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="card space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2"><HiLockClosed className="w-5 h-5" /> Change Password</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="input-field w-full" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field w-full" required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="card space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2"><HiShieldCheck className="w-5 h-5" /> Privacy Settings</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">Profile Visibility</label>
                <select value={privacy.profileVisibility}
                  onChange={e => setPrivacy(p => ({ ...p, profileVisibility: e.target.value }))}
                  className="input-field w-full">
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Show Online Status</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Let others see when you're online</p>
                </div>
                <button onClick={() => setPrivacy(p => ({ ...p, showOnlineStatus: !p.showOnlineStatus }))}
                  className={`w-11 h-6 rounded-full transition-colors ${privacy.showOnlineStatus ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-elevated'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacy.showOnlineStatus ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Allow Friend Requests</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Let others send you friend requests</p>
                </div>
                <button onClick={() => setPrivacy(p => ({ ...p, allowFriendRequests: !p.allowFriendRequests }))}
                  className={`w-11 h-6 rounded-full transition-colors ${privacy.allowFriendRequests ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-elevated'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${privacy.allowFriendRequests ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <button onClick={handleUpdatePrivacy} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2"><HiPaintBrush className="w-5 h-5" /> Appearance</h2>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
                </div>
                <button onClick={toggleTheme}
                  className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-elevated'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2"><HiBell className="w-5 h-5" /> Notification Preferences</h2>
              {Object.keys(notifications).map(item => (
                <div key={item} className="flex items-center justify-between py-2">
                  <p className="text-sm font-medium">{item}</p>
                  <button onClick={() => setNotifications(prev => ({ ...prev, [item]: !prev[item] }))}
                    className={`w-11 h-6 rounded-full transition-colors ${notifications[item] ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-elevated'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifications[item] ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
              <button onClick={async () => {
                const enabled = Object.values(notifications).some(v => v);
                try {
                  const { data } = await API.put('/auth/profile', { notificationsEnabled: enabled });
                  updateUser(data);
                  toast.success('Notification preferences saved!');
                } catch (err) { toast.error('Failed to save'); }
              }} className="btn-primary">Save Preferences</button>
            </div>
          )}

          {/* Sessions / Devices Tab */}
          {activeTab === 'sessions' && (
            <div className="card space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><HiDevicePhoneMobile className="w-5 h-5" /> Active Sessions</h2>
                {sessions.length === 0 && (
                  <button onClick={fetchSessions} className="btn-primary text-xs px-4 py-1.5">
                    {sessionsLoading ? 'Loading...' : 'Load Sessions'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage devices where you're logged in. You can log out from any device remotely.
              </p>
              {sessions.length > 0 && (
                <>
                  <div className="space-y-3">
                    {sessions.map(s => {
                      const DevIcon = getDeviceIcon(s.device?.type);
                      return (
                        <div key={s._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          s.isCurrent ? 'border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-gray-200/60 dark:border-dark-border/60'
                        }`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            s.isCurrent ? 'bg-primary/15 text-primary' : 'bg-gray-100 dark:bg-dark-hover text-gray-400'
                          }`}>
                            <DevIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{s.device?.browser || 'Unknown'} on {s.device?.os || 'Unknown'}</p>
                              {s.isCurrent && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">This device</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              {s.ipAddress || 'Unknown IP'} · Last active {new Date(s.lastActive).toLocaleDateString()}
                            </p>
                          </div>
                          {!s.isCurrent && (
                            <button onClick={() => revokeSession(s._id)}
                              className="p-2 rounded-lg hover:bg-accent-coral/10 text-accent-coral" title="Log out this device">
                              <HiXMark className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {sessions.filter(s => !s.isCurrent).length > 0 && (
                    <button onClick={revokeAllOther}
                      className="w-full py-2.5 text-sm font-semibold text-accent-coral hover:bg-accent-coral/10 rounded-xl transition-colors">
                      Log out all other devices
                    </button>
                  )}
                </>
              )}
              {sessions.length > 0 && (
                <button onClick={fetchSessions} className="text-xs text-primary hover:underline">
                  Refresh sessions
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
