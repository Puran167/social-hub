import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiXMark, HiMusicalNote, HiXCircle } from 'react-icons/hi2';
import API from '../services/api';
import toast from 'react-hot-toast';

const EditPostModal = ({ post, onClose, onUpdated }) => {
  const [text, setText] = useState(post.text || '');
  const [songUrl, setSongUrl] = useState(post.songUrl || '');
  const [songTitle, setSongTitle] = useState(post.songTitle || '');
  const [removeSong, setRemoveSong] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { text: text.trim() };
      if (removeSong) {
        body.songUrl = '';
        body.songTitle = '';
      } else if (songUrl !== (post.songUrl || '')) {
        body.songUrl = songUrl.trim();
        body.songTitle = songTitle.trim();
      }
      const { data } = await API.put(`/posts/${post._id}`, body);
      toast.success('Post updated');
      onUpdated(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/60 dark:border-dark-border/60">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Edit Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-colors">
            <HiXMark className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Text */}
          <div className="px-5 py-4">
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm resize-none outline-none"
              placeholder="Edit your post..."
            />
          </div>

          {/* Current image (read-only preview) */}
          {post.imageUrl && (
            <div className="mx-5 mb-3 rounded-2xl overflow-hidden">
              <img src={post.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-2xl opacity-60" />
              <p className="text-[10px] text-gray-400 text-center mt-1">Image cannot be changed after posting</p>
            </div>
          )}

          {/* Song editing */}
          {(post.songUrl && !removeSong) ? (
            <div className="mx-5 mb-3 p-3 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <HiMusicalNote className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm truncate text-gray-700 dark:text-gray-300">{post.songTitle || 'Attached song'}</span>
              </div>
              <button type="button" onClick={() => setRemoveSong(true)} className="text-red-400 hover:text-red-500 flex-shrink-0 ml-2">
                <HiXCircle className="w-5 h-5" />
              </button>
            </div>
          ) : !post.songUrl && (
            <div className="mx-5 mb-3 space-y-2">
              <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <HiMusicalNote className="w-3.5 h-3.5" /> Attach Music
              </p>
              <input
                type="url"
                value={songUrl}
                onChange={e => setSongUrl(e.target.value)}
                placeholder="Song URL"
                className="w-full text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                placeholder="Song title"
                className="w-full text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Submit */}
          <div className="px-5 pb-5 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 nebula-gradient text-white rounded-2xl font-semibold text-sm shadow-glow-sm hover:shadow-glow transition-shadow disabled:opacity-40"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditPostModal;
