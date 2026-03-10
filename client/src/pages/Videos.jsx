import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiVideoCamera, HiPlus, HiHeart, HiChatBubbleLeft, HiEye, HiPlay } from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const Videos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    try {
      const { data } = await API.get('/videos');
      setVideos(data.videos || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a video');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('title', title);
      form.append('description', description);
      const { data } = await API.post('/videos', form);
      setVideos(prev => [data, ...prev]);
      setShowUpload(false);
      setFile(null); setTitle(''); setDescription('');
      toast.success('Video uploaded!');
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleLike = async (videoId) => {
    try {
      const { data } = await API.put(`/videos/like/${videoId}`);
      setVideos(prev => prev.map(v => v._id === videoId ? data : v));
      if (selectedVideo?._id === videoId) setSelectedVideo(data);
    } catch (err) { /* ignore */ }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !selectedVideo) return;
    try {
      const { data } = await API.post(`/videos/comment/${selectedVideo._id}`, { text: comment });
      setVideos(prev => prev.map(v => v._id === data._id ? data : v));
      setSelectedVideo(data);
      setComment('');
    } catch (err) { toast.error('Comment failed'); }
  };

  const openVideo = (video) => {
    setSelectedVideo(video);
    API.put(`/videos/view/${video._id}`).catch(() => {});
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading videos..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Library</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{videos.length} videos</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Upload Video
        </button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(video => (
          <div key={video._id} onClick={() => openVideo(video)}
            className="card group cursor-pointer">
            <div className="aspect-video rounded-lg bg-black mb-3 overflow-hidden relative">
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50">
                  <HiVideoCamera className="w-10 h-10 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/30">
                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                  <HiPlay className="w-7 h-7 text-black ml-1" />
                </div>
              </div>
              {video.duration > 0 && (
                <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs">
                  {Math.floor(video.duration / 60)}:{(Math.floor(video.duration % 60)).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            <p className="text-sm font-medium truncate">{video.title}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{video.uploadedBy?.name}</span>
              <span className="flex items-center gap-1"><HiEye className="w-3 h-3" /> {video.views}</span>
              <span className="flex items-center gap-1"><HiHeart className="w-3 h-3" /> {video.likes?.length || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-16">
          <HiVideoCamera className="w-16 h-16 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No videos yet</p>
        </div>
      )}

      {/* Video Player Modal */}
      <Modal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} size="xl">
        {selectedVideo && (
          <div className="space-y-4 -m-5">
            <div className="bg-black">
              <video src={selectedVideo.videoUrl} controls autoPlay className="w-full max-h-[60vh] mx-auto" />
            </div>
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold">{selectedVideo.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{selectedVideo.views} views</span>
                <span>{new Date(selectedVideo.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleLike(selectedVideo._id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${selectedVideo.likes?.includes(user?._id) ? 'bg-red-500/20 text-red-400' : 'bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:bg-dark-elevated'}`}>
                  <HiHeart className="w-4 h-4" /> {selectedVideo.likes?.length || 0}
                </button>
              </div>
              {selectedVideo.description && <p className="text-sm text-gray-500 dark:text-gray-400">{selectedVideo.description}</p>}
              {/* Comments */}
              <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-3">
                <h3 className="text-sm font-medium">{selectedVideo.comments?.length || 0} Comments</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedVideo.comments?.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-hover flex-shrink-0" />
                      <div>
                        <span className="text-xs font-medium">{c.user?.name}</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleComment} className="flex gap-2">
                  <input type="text" value={comment} onChange={e => setComment(e.target.value)}
                    className="input-field flex-1 py-2 text-sm" placeholder="Add a comment..." />
                  <button type="submit" className="btn-primary text-sm px-4">Post</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Video" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <FileDropzone onDrop={(files) => setFile(files[0])} accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }}
            label="Drop your video here">
            {file && <p className="text-sm text-primary dark:text-primary-dark">{file.name}</p>}
          </FileDropzone>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="input-field w-full" placeholder="Video title" required />
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="input-field w-full" placeholder="Description" rows={3} />
          <button type="submit" disabled={uploading} className="btn-primary w-full disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Videos;
