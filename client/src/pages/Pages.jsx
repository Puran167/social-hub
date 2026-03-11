import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  HiPlus, HiMagnifyingGlass, HiCheckBadge, HiUserGroup,
  HiDocumentText, HiMusicalNote, HiSparkles, HiAcademicCap,
  HiBuildingStorefront, HiUsers
} from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const categoryIcons = {
  Music: HiMusicalNote,
  Creator: HiSparkles,
  Brand: HiBuildingStorefront,
  Community: HiUsers,
  Education: HiAcademicCap,
};

const categoryColors = {
  Music: 'from-pink-500 to-violet-500',
  Creator: 'from-amber-500 to-orange-500',
  Brand: 'from-blue-500 to-cyan-500',
  Community: 'from-green-500 to-emerald-500',
  Education: 'from-indigo-500 to-purple-500',
};

const Pages = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [myPages, setMyPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState('discover');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        API.get('/pages'),
        API.get('/pages/my'),
      ]);
      setPages(allRes.data.pages || []);
      setMyPages(myRes.data || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleFollow = async (pageId) => {
    try {
      await API.post(`/pages/${pageId}/follow`);
      toast.success('Following page!');
      fetchData();
    } catch (err) { toast.error('Failed to follow'); }
  };

  const handleUnfollow = async (pageId) => {
    try {
      await API.post(`/pages/${pageId}/unfollow`);
      toast.success('Unfollowed');
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const filtered = pages.filter(p => {
    if (category && p.category !== category) return false;
    if (search && !p.pageName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner size="lg" text="Loading pages..." />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-purple-600/80 to-accent-pink/70 p-6 lg:p-8">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-1">Pages</h1>
            <p className="text-white/70 text-sm">{pages.length} pages · {myPages.length} your pages</p>
          </div>
          <Link to="/pages/create">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-white text-primary font-semibold text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-black/10">
              <HiPlus className="w-4 h-4" /> Create Page
            </motion.button>
          </Link>
        </div>

        {/* Search */}
        <div className="mt-5 max-w-md">
          <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
            <HiMagnifyingGlass className="w-4 h-4 text-white/60 mr-2" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search pages..." className="bg-transparent text-white placeholder-white/40 outline-none w-full text-sm" />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-2">
        {['discover', 'my-pages', 'following'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover'
            }`}>
            {t === 'discover' ? 'Discover' : t === 'my-pages' ? 'My Pages' : 'Following'}
          </button>
        ))}
      </motion.div>

      {/* Category filters */}
      {tab === 'discover' && (
        <motion.div variants={item} className="flex gap-2 flex-wrap">
          <button onClick={() => setCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!category ? 'bg-primary/10 text-primary dark:text-primary-dark border border-primary/30' : 'bg-gray-100 dark:bg-dark-elevated text-gray-500'}`}>
            All
          </button>
          {Object.keys(categoryIcons).map(cat => {
            const Icon = categoryIcons[cat];
            return (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${category === cat ? 'bg-primary/10 text-primary dark:text-primary-dark border border-primary/30' : 'bg-gray-100 dark:bg-dark-elevated text-gray-500'}`}>
                <Icon className="w-3.5 h-3.5" /> {cat}
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Content */}
      {tab === 'discover' && (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(page => (
            <PageCard key={page._id} page={page} user={user}
              onFollow={handleFollow} onUnfollow={handleUnfollow} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <HiDocumentText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No pages found</p>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'my-pages' && (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myPages.map(page => (
            <PageCard key={page._id} page={page} user={user} isOwned
              onFollow={handleFollow} onUnfollow={handleUnfollow} />
          ))}
          {myPages.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">You haven't created any pages yet</p>
              <Link to="/pages/create" className="text-primary font-medium text-sm mt-2 inline-block">Create your first page →</Link>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'following' && (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.filter(p => p.followers?.includes(user._id)).map(page => (
            <PageCard key={page._id} page={page} user={user}
              onFollow={handleFollow} onUnfollow={handleUnfollow} />
          ))}
          {pages.filter(p => p.followers?.includes(user._id)).length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">You're not following any pages yet</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

const PageCard = ({ page, user, isOwned, onFollow, onUnfollow }) => {
  const isFollowing = page.followers?.includes(user?._id);
  const CatIcon = categoryIcons[page.category] || HiDocumentText;
  const gradColor = categoryColors[page.category] || 'from-gray-500 to-gray-600';

  return (
    <motion.div variants={item}>
      <Link to={`/pages/${page._id}`} className="block">
        <div className="card group hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Cover */}
          <div className={`h-24 bg-gradient-to-r ${gradColor} relative -mx-5 -mt-5 mb-4`}>
            {page.coverPhoto && (
              <img src={page.coverPhoto} alt="" className="w-full h-full object-cover" />
            )}
            {page.verified && (
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1">
                <HiCheckBadge className="w-4 h-4 text-blue-500" />
              </div>
            )}
          </div>
          {/* Profile photo */}
          <div className="flex items-start gap-3 -mt-10 relative z-10">
            <div className="w-14 h-14 rounded-xl bg-white dark:bg-dark-card shadow-lg border-2 border-white dark:border-dark-card overflow-hidden flex-shrink-0">
              {page.profilePhoto ? (
                <img src={page.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradColor} flex items-center justify-center`}>
                  <CatIcon className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 pt-3">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm truncate">{page.pageName}</h3>
                {page.verified && <HiCheckBadge className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{page.category}</span>
            </div>
          </div>
          {/* Description */}
          {page.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{page.description}</p>
          )}
          {/* Stats + action */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><HiUserGroup className="w-3.5 h-3.5" /> {page.followers?.length || 0}</span>
            </div>
            {!isOwned && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); isFollowing ? onUnfollow(page._id) : onFollow(page._id); }}
                className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${isFollowing ? 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400' : 'bg-primary/10 text-primary dark:text-primary-dark'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            {isOwned && (
              <span className="text-xs font-medium text-primary dark:text-primary-dark">Manage →</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default Pages;
