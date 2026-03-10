import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HiPhoto, HiVideoCamera, HiMusicalNote, HiPlusCircle, HiSparkles,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import EditPostModal from '../components/EditPostModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const observerRef = useRef();
  const sentinelRef = useRef();

  const fetchPosts = useCallback(async (pageNum, replace = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const { data } = await API.get(`/posts/feed?page=${pageNum}&limit=10`);
      setPosts(prev => replace ? data.posts : [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPosts(1, true); }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchPosts(page + 1);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreate(false);
  };

  const handlePostUpdated = (updated) => {
    setPosts(prev => prev.map(p => p._id === updated._id ? updated : p));
    setEditingPost(null);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await API.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch (err) { toast.error('Failed to delete post'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading your feed..." />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-5">
      {/* Create Post Card */}
      <motion.div variants={item} className="glass-card p-4">
        <div className="flex items-center gap-3">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full nebula-gradient flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]}
            </div>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-dark-hover/80 text-gray-400 dark:text-gray-500 text-sm hover:bg-gray-200/60 dark:hover:bg-dark-hover transition-colors"
          >
            What's on your mind, {user?.name?.split(' ')[0]}?
          </button>
        </div>
        <div className="flex items-center justify-around mt-3 pt-3 border-t border-gray-100/60 dark:border-dark-border/30">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/60 transition-colors text-sm text-gray-500 dark:text-gray-400">
            <HiPhoto className="w-5 h-5 text-accent-teal" /> Photo
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/60 transition-colors text-sm text-gray-500 dark:text-gray-400">
            <HiVideoCamera className="w-5 h-5 text-accent-coral" /> Video
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/60 transition-colors text-sm text-gray-500 dark:text-gray-400">
            <HiMusicalNote className="w-5 h-5 text-primary dark:text-primary-dark" /> Music
          </button>
        </div>
      </motion.div>

      {/* Posts */}
      {posts.length === 0 ? (
        <motion.div variants={item} className="glass-card p-12 text-center">
          <div className="w-20 h-20 mx-auto rounded-full nebula-gradient flex items-center justify-center mb-4 shadow-glow">
            <HiSparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Your feed is empty</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
            Add friends or create your first post to get started
          </p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-6 py-2.5 nebula-gradient text-white rounded-2xl text-sm font-semibold shadow-glow-sm hover:shadow-glow transition-shadow">
            Create Post
          </button>
        </motion.div>
      ) : (
        posts.map(post => (
          <motion.div key={post._id} variants={item}>
            <PostCard
              post={post}
              onUpdate={setEditingPost}
              onDelete={handleDeletePost}
            />
          </motion.div>
        ))
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-6">You're all caught up!</p>
      )}

      {/* Modals */}
      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={handlePostCreated}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}
    </motion.div>
  );
};

export default Feed;
