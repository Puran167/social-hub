import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiCheckBadge, HiUserGroup, HiDocumentText, HiHeart, HiChatBubbleLeft,
  HiPlus, HiArrowLeft, HiMusicalNote, HiSparkles, HiBuildingStorefront,
  HiUsers, HiAcademicCap, HiPhoto, HiVideoCamera, HiPaperAirplane,
  HiCalendarDays, HiShoppingBag, HiChartBar, HiCog6Tooth, HiXMark,
  HiEllipsisHorizontal, HiChatBubbleOvalLeft, HiHandThumbUp, HiFilm,
  HiPlay, HiPause, HiPencilSquare, HiTrash, HiTruck, HiMapPin, HiPhone,
  HiCreditCard, HiClipboardDocumentList
} from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const categoryIcons = { Music: HiMusicalNote, Creator: HiSparkles, Brand: HiBuildingStorefront, Community: HiUsers, Education: HiAcademicCap };
const categoryColors = { Music: 'from-pink-500 to-violet-500', Creator: 'from-amber-500 to-orange-500', Brand: 'from-blue-500 to-cyan-500', Community: 'from-green-500 to-emerald-500', Education: 'from-indigo-500 to-purple-500' };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const PageDetail = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postType, setPostType] = useState('text');
  const [postFile, setPostFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [postComment, setPostComment] = useState({});

  // Stories state
  const [stories, setStories] = useState([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [uploadingStory, setUploadingStory] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const msgEndRef = useRef(null);

  // Events state
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', eventDate: '', eventLink: '' });

  // Products state
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ productName: '', price: '', description: '' });
  const [productFile, setProductFile] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyForm, setBuyForm] = useState({ fullName: '', phone: '', address: '', city: '', pincode: '', quantity: 1, note: '' });
  const [buying, setBuying] = useState(false);
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [shopSubTab, setShopSubTab] = useState('products');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ productName: '', price: '', description: '' });
  const [editProductFile, setEditProductFile] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');

  // Community/Discussions state
  const [discussions, setDiscussions] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState('');
  const [replyText, setReplyText] = useState({});
  const [showReplyFor, setShowReplyFor] = useState(null);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);

  // Followers modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  // Edit/Delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ pageName: '', category: '', description: '' });
  const [editProfilePhoto, setEditProfilePhoto] = useState(null);
  const [editCoverPhoto, setEditCoverPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  useEffect(() => {
    if (tab === 'posts') fetchPosts();
    if (tab === 'stories') fetchStories();
    if (tab === 'messages') fetchMessages();
    if (tab === 'events') fetchEvents();
    if (tab === 'shop') { fetchProducts(); if (isAdmin) fetchOrders(); fetchMyOrders(); }
    if (tab === 'playlists') fetchPlaylists();
    if (tab === 'community') fetchDiscussions();
    if (tab === 'analytics') fetchAnalytics();
  }, [tab, pageId]);

  const fetchPage = async () => {
    try {
      const { data } = await API.get(`/pages/${pageId}`);
      setPage(data);
      setIsAdmin(data.creator?._id === user._id || data.admins?.some(a => a.user?._id === user._id));
      setIsFollowing(data.followers?.some(f => (f._id || f) === user._id));
    } catch (err) { toast.error('Page not found'); navigate('/pages'); }
    setLoading(false);
  };

  const fetchPosts = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/posts`); setPosts(data); } catch {}
  };
  const fetchStories = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/stories`); setStories(data); } catch {}
  };
  const fetchMessages = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/messages`); setMessages(data); setTimeout(() => msgEndRef.current?.scrollIntoView(), 100); } catch {}
  };
  const fetchEvents = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/events`); setEvents(data); } catch {}
  };
  const fetchProducts = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/products`); setProducts(data); } catch {}
  };
  const fetchPlaylists = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/playlists`); setPlaylists(data); } catch {}
  };
  const fetchDiscussions = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/discussions`); setDiscussions(data); } catch {}
  };
  const fetchAnalytics = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/analytics`); setAnalytics(data); } catch {}
  };

  // Handlers
  const handleFollow = async () => {
    try {
      await API.post(`/pages/${pageId}/${isFollowing ? 'unfollow' : 'follow'}`);
      setIsFollowing(!isFollowing);
      fetchPage();
    } catch { toast.error('Failed'); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postCaption.trim() && !postFile) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append('caption', postCaption);
      form.append('type', postType);
      if (postFile) form.append('media', postFile);
      await API.post(`/pages/${pageId}/post`, form);
      toast.success('Post created!');
      setShowPostModal(false); setPostCaption(''); setPostFile(null); setPostType('text');
      fetchPosts();
    } catch { toast.error('Failed'); }
    setPosting(false);
  };

  const handleLikePost = async (postId) => {
    try {
      const { data } = await API.put(`/pages/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p._id === postId ? data : p));
    } catch {}
  };

  const handleCommentPost = async (e, postId) => {
    e.preventDefault();
    if (!postComment[postId]?.trim()) return;
    try {
      const { data } = await API.post(`/pages/posts/${postId}/comment`, { text: postComment[postId] });
      setPosts(prev => prev.map(p => p._id === postId ? data : p));
      setPostComment(prev => ({ ...prev, [postId]: '' }));
    } catch { toast.error('Failed'); }
  };

  const handleCreateStory = async () => {
    if (!storyFile) return;
    setUploadingStory(true);
    try {
      const form = new FormData();
      form.append('media', storyFile);
      await API.post(`/pages/${pageId}/story`, form);
      toast.success('Story added!');
      setShowStoryModal(false); setStoryFile(null); fetchStories();
    } catch { toast.error('Failed'); }
    setUploadingStory(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      const { data } = await API.post(`/pages/${pageId}/message`, { message: messageText });
      setMessages(prev => [...prev, data]);
      setMessageText('');
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed'); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/pages/${pageId}/event`, eventForm);
      toast.success('Event created!');
      setShowEventModal(false); setEventForm({ title: '', description: '', eventDate: '', eventLink: '' }); fetchEvents();
    } catch { toast.error('Failed'); }
  };

  const handleJoinEvent = async (eventId) => {
    try {
      await API.post(`/pages/events/${eventId}/join`);
      fetchEvents();
    } catch { toast.error('Failed'); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('productName', productForm.productName);
    form.append('price', productForm.price);
    form.append('description', productForm.description);
    if (productFile) form.append('media', productFile);
    try {
      await API.post(`/pages/${pageId}/product`, form);
      toast.success('Product added!');
      setShowProductModal(false); setProductForm({ productName: '', price: '', description: '' }); setProductFile(null); fetchProducts();
    } catch { toast.error('Failed'); }
  };

  const fetchOrders = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/orders`); setOrders(data); } catch {}
  };
  const fetchMyOrders = async () => {
    try { const { data } = await API.get(`/pages/${pageId}/my-orders`); setMyOrders(data); } catch {}
  };

  const handleBuyProduct = async (e) => {
    e.preventDefault();
    if (!buyForm.fullName || !buyForm.phone || !buyForm.address) return toast.error('Fill in required fields');
    setBuying(true);
    try {
      // Step 1: Create Razorpay order
      const { data } = await API.post('/payment/create-order', {
        productId: selectedProduct._id,
        quantity: buyForm.quantity || 1,
      });

      // Step 2: Open Razorpay checkout
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Personal Social Hub',
        description: selectedProduct.productName,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            // Step 3: Verify payment and create order
            await API.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              productId: selectedProduct._id,
              ...buyForm,
            });
            toast.success('Payment successful! Order placed.');
            setShowBuyModal(false);
            setSelectedProduct(null);
            setBuyForm({ fullName: '', phone: '', address: '', city: '', pincode: '', quantity: 1, note: '' });
            fetchMyOrders();
            if (isAdmin) fetchOrders();
          } catch {
            toast.error('Payment verification failed');
          }
          setBuying(false);
        },
        prefill: {
          name: buyForm.fullName,
          contact: buyForm.phone,
        },
        theme: { color: '#7C3AED' },
        modal: {
          ondismiss: () => setBuying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setBuying(false);
      });
      rzp.open();
    } catch {
      toast.error('Could not initiate payment');
      setBuying(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await API.put(`/pages/order/${orderId}/status`, { status });
      toast.success(`Order ${status}`);
      fetchOrders();
    } catch { toast.error('Failed'); }
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setEditProductForm({ productName: prod.productName, price: prod.price, description: prod.description || '' });
    setEditProductFile(null);
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const form = new FormData();
      form.append('productName', editProductForm.productName);
      form.append('price', editProductForm.price);
      form.append('description', editProductForm.description);
      if (editProductFile) form.append('media', editProductFile);
      await API.put(`/pages/product/${editingProduct._id}`, form);
      toast.success('Product updated!');
      setEditingProduct(null);
      fetchProducts();
    } catch { toast.error('Update failed'); }
    setSavingProduct(false);
  };

  const handleDeleteProduct = async (prodId) => {
    try {
      await API.delete(`/pages/product/${prodId}`);
      toast.success('Product deleted');
      setSelectedProduct(null);
      fetchProducts();
    } catch { toast.error('Delete failed'); }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistTitle.trim()) return;
    try {
      await API.post(`/pages/${pageId}/playlist`, { title: playlistTitle });
      toast.success('Playlist created!');
      setShowPlaylistModal(false); setPlaylistTitle(''); fetchPlaylists();
    } catch { toast.error('Failed'); }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscussion.trim()) return;
    try {
      await API.post(`/pages/${pageId}/discussion`, { text: newDiscussion });
      setNewDiscussion(''); fetchDiscussions();
    } catch { toast.error('Failed'); }
  };

  const handleReplyDiscussion = async (e, discId) => {
    e.preventDefault();
    if (!replyText[discId]?.trim()) return;
    try {
      await API.post(`/pages/discussions/${discId}/reply`, { text: replyText[discId] });
      setReplyText(prev => ({ ...prev, [discId]: '' })); setShowReplyFor(null); fetchDiscussions();
    } catch { toast.error('Failed'); }
  };

  const handleLikeDiscussion = async (discId) => {
    try { await API.put(`/pages/discussions/${discId}/like`); fetchDiscussions(); } catch {}
  };

  const handleDeletePost = async (postId) => {
    try {
      await API.delete(`/pages/posts/${postId}`);
      toast.success('Post deleted');
      fetchPosts();
    } catch { toast.error('Delete failed'); }
  };

  const openEditModal = () => {
    setEditForm({ pageName: page.pageName, category: page.category, description: page.description || '' });
    setEditProfilePhoto(null);
    setEditCoverPhoto(null);
    setShowEditModal(true);
  };

  const handleEditPage = async (e) => {
    e.preventDefault();
    if (!editForm.pageName.trim() || !editForm.category) return toast.error('Name and category required');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('pageName', editForm.pageName);
      form.append('category', editForm.category);
      form.append('description', editForm.description);
      if (editProfilePhoto) form.append('profilePhoto', editProfilePhoto);
      if (editCoverPhoto) form.append('coverPhoto', editCoverPhoto);
      await API.put(`/pages/${pageId}`, form);
      toast.success('Page updated!');
      setShowEditModal(false);
      fetchPage();
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handleDeletePage = async () => {
    setDeleting(true);
    try {
      await API.delete(`/pages/${pageId}`);
      toast.success('Page deleted');
      navigate('/pages');
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading page..." />;
  if (!page) return null;

  const CatIcon = categoryIcons[page.category] || HiDocumentText;
  const gradColor = categoryColors[page.category] || 'from-gray-500 to-gray-600';

  const tabs = [
    { key: 'posts', label: 'Posts', icon: HiDocumentText },
    { key: 'stories', label: 'Stories', icon: HiFilm },
    { key: 'events', label: 'Events', icon: HiCalendarDays },
    { key: 'community', label: 'Community', icon: HiChatBubbleOvalLeft },
    { key: 'messages', label: 'Chat', icon: HiChatBubbleLeft },
    ...(page.category === 'Music' ? [{ key: 'playlists', label: 'Playlists', icon: HiMusicalNote }] : []),
    { key: 'shop', label: 'Shop', icon: HiShoppingBag },
    ...(isAdmin ? [{ key: 'orders', label: 'Orders', icon: HiClipboardDocumentList }] : []),
    ...(isAdmin ? [{ key: 'analytics', label: 'Analytics', icon: HiChartBar }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/pages')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
        <HiArrowLeft className="w-4 h-4" /> Back to Pages
      </button>

      {/* Cover + profile header */}
      <div className="card overflow-hidden !p-0">
        <div className={`h-40 sm:h-52 bg-gradient-to-r ${gradColor} relative`}>
          {page.coverPhoto && <img src={page.coverPhoto} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-5 pb-5 -mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-dark-card shadow-lg overflow-hidden flex-shrink-0 bg-white dark:bg-dark-card">
              {page.profilePhoto ? (
                <img src={page.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradColor} flex items-center justify-center`}>
                  <CatIcon className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold">{page.pageName}</h1>
                {page.verified && <HiCheckBadge className="w-5 h-5 text-blue-500" />}
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-500">{page.category}</span>
              </div>
              {page.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{page.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <button onClick={() => setShowFollowersModal(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <HiUserGroup className="w-4 h-4" /> {page.followers?.length || 0} followers
                </button>
                <span className="flex items-center gap-1"><HiDocumentText className="w-4 h-4" /> {page.postCount || 0} posts</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!isAdmin && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleFollow}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${isFollowing ? 'bg-gray-100 dark:bg-dark-elevated text-gray-600' : 'btn-primary'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </motion.button>
              )}
              <button onClick={() => setTab('messages')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-dark-elevated hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors">
                <HiChatBubbleLeft className="w-5 h-5" />
              </button>
              {isAdmin && (
                <>
                  <button onClick={openEditModal}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-dark-elevated hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                    title="Edit Page">
                    <HiPencilSquare className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors"
                    title="Delete Page">
                    <HiTrash className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════ TAB: POSTS ════════ */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => setShowPostModal(true)} className="btn-primary text-sm flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Create Post
            </button>
          )}
          {posts.length === 0 && <p className="text-center text-gray-500 py-10">No posts yet</p>}
          {posts.map(post => (
            <motion.div key={post._id} variants={item} initial="hidden" animate="show" className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-hover">
                  {page.profilePhoto ? <img src={page.profilePhoto} alt="" className="w-full h-full object-cover" /> : <CatIcon className="w-5 h-5 m-auto text-gray-400 mt-2.5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm">{page.pageName}</span>
                    {page.verified && <HiCheckBadge className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeletePost(post._id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete post">
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
              {post.caption && <p className="text-sm">{post.caption}</p>}
              {post.mediaUrl && post.type === 'photo' && (
                <img src={post.mediaUrl} alt="" className="rounded-xl w-full max-h-[500px] object-cover" />
              )}
              {post.mediaUrl && (post.type === 'reel' || post.type === 'video') && (
                <video src={post.mediaUrl} controls className="rounded-xl w-full max-h-[500px]" />
              )}
              {post.mediaUrl && post.type === 'music' && (
                <audio src={post.mediaUrl} controls className="w-full" />
              )}
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-dark-border">
                <button onClick={() => handleLikePost(post._id)}
                  className={`flex items-center gap-1 text-sm ${post.likes?.includes(user._id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition-colors`}>
                  <HiHeart className="w-5 h-5" /> {post.likes?.length || 0}
                </button>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <HiChatBubbleLeft className="w-5 h-5" /> {post.comments?.length || 0}
                </span>
              </div>
              {/* Comments */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {post.comments?.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-hover flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold">{c.user?.name}</span>
                      <p className="text-xs text-gray-500">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={e => handleCommentPost(e, post._id)} className="flex gap-2">
                <input type="text" value={postComment[post._id] || ''}
                  onChange={e => setPostComment(prev => ({ ...prev, [post._id]: e.target.value }))}
                  className="input-field flex-1 py-1.5 text-sm" placeholder="Add comment..." />
                <button type="submit" className="text-primary font-semibold text-sm">Post</button>
              </form>
            </motion.div>
          ))}
        </div>
      )}

      {/* ════════ TAB: STORIES ════════ */}
      {tab === 'stories' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => setShowStoryModal(true)} className="btn-primary text-sm flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Add Story
            </button>
          )}
          {stories.length === 0 && <p className="text-center text-gray-500 py-10">No active stories</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stories.map(story => (
              <div key={story._id} className="aspect-[9/16] rounded-2xl overflow-hidden relative group">
                {story.mediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                  <video src={story.mediaUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs">Expires {new Date(story.expiresAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB: MESSAGES ════════ */}
      {tab === 'messages' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="font-bold text-sm">Chat with {page.pageName}</h3>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg._id} className={`flex ${msg.sender?._id === user._id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  msg.isFromPage ? 'bg-primary/10 text-primary dark:text-primary-dark' :
                  msg.sender?._id === user._id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-elevated'
                }`}>
                  {msg.isFromPage && <span className="text-[10px] font-bold block mb-0.5">{page.pageName}</span>}
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-dark-border flex gap-2">
            <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)}
              className="input-field flex-1 py-2 text-sm" placeholder="Type a message..." />
            <button type="submit" className="btn-primary p-2 rounded-xl">
              <HiPaperAirplane className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* ════════ TAB: EVENTS ════════ */}
      {tab === 'events' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => setShowEventModal(true)} className="btn-primary text-sm flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Create Event
            </button>
          )}
          {events.length === 0 && <p className="text-center text-gray-500 py-10">No events yet</p>}
          {events.map(ev => {
            const isGoing = ev.participants?.some(p => (p._id || p) === user._id);
            return (
            <div key={ev._id} className="card flex flex-col sm:flex-row gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs text-primary font-bold">{new Date(ev.eventDate).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-xl font-extrabold text-primary">{new Date(ev.eventDate).getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{ev.title}</h3>
                {ev.description && <p className="text-sm text-gray-500 mt-1">{ev.description}</p>}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs text-gray-500">{ev.participants?.length || 0} going</span>
                  <button onClick={() => handleJoinEvent(ev._id)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg ${
                      isGoing
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-primary/10 text-primary'
                    }`}>
                    {isGoing ? 'Going ✓' : 'Join Event'}
                  </button>
                  {isGoing && ev.eventLink && (
                    <a href={ev.eventLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1">
                      🔗 Attend Event
                    </a>
                  )}
                </div>
                {isGoing && !ev.eventLink && (
                  <p className="text-xs text-gray-400 mt-2 italic">Event link will be shared by the organizer</p>
                )}
              </div>
              {isAdmin && (
                <button onClick={async () => { try { await API.delete(`/pages/events/${ev._id}`); toast.success('Event deleted'); fetchEvents(); } catch { toast.error('Failed'); }}}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-start"
                  title="Delete event">
                  <HiTrash className="w-4 h-4" />
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* ════════ TAB: SHOP ════════ */}
      {tab === 'shop' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setShowProductModal(true)} className="btn-primary text-sm flex items-center gap-2">
                <HiPlus className="w-4 h-4" /> Add Product
              </button>
            </div>
          )}

          {/* My Orders (for any user) */}
          {myOrders.length > 0 && (
            <div className="card space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><HiTruck className="w-4 h-4" /> My Orders</h3>
              {myOrders.map(order => (
                <div key={order._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-hover flex-shrink-0">
                    {order.product?.productImage ? <img src={order.product.productImage} alt="" className="w-full h-full object-cover" /> : <HiShoppingBag className="w-6 h-6 text-gray-400 m-auto mt-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{order.product?.productName}</p>
                    <p className="text-xs text-gray-500">Qty: {order.quantity} · ₹{order.totalPrice}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                    order.status === 'confirmed' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>{order.status}</span>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 && <p className="text-center text-gray-500 py-10">No products yet</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map(prod => (
              <motion.div key={prod._id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                className="card !p-0 overflow-hidden group cursor-pointer" onClick={() => setSelectedProduct(prod)}>
                <div className="aspect-square bg-gray-100 dark:bg-dark-elevated overflow-hidden relative">
                  {prod.productImage ? (
                    <img src={prod.productImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><HiShoppingBag className="w-10 h-10 text-gray-300" /></div>
                  )}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditProduct(prod)} className="p-1.5 rounded-lg bg-white/90 dark:bg-dark-card/90 shadow-sm hover:bg-white transition-colors">
                        <HiPencilSquare className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button onClick={() => handleDeleteProduct(prod._id)} className="p-1.5 rounded-lg bg-white/90 dark:bg-dark-card/90 shadow-sm hover:bg-red-50 transition-colors">
                        <HiTrash className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{prod.productName}</p>
                  <p className="text-primary font-bold text-sm mt-1">₹{prod.price}</p>
                  {prod.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prod.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB: ORDERS (Admin) ════════ */}
      {tab === 'orders' && isAdmin && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><HiClipboardDocumentList className="w-5 h-5" /> Page Orders</h2>
          {orders.length === 0 && <p className="text-center text-gray-500 py-10">No orders yet</p>}
          {orders.map(order => (
            <div key={order._id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-hover flex-shrink-0">
                  {order.product?.productImage ? <img src={order.product.productImage} alt="" className="w-full h-full object-cover" /> : <HiShoppingBag className="w-6 h-6 text-gray-400 m-auto mt-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{order.product?.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {order.quantity} · ₹{order.totalPrice}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                  order.status === 'confirmed' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>{order.status}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1 border-t border-gray-100 dark:border-dark-hover pt-2">
                <p><span className="font-medium">Buyer:</span> {order.buyer?.name}</p>
                <p className="flex items-center gap-1"><HiMapPin className="w-3 h-3" /> {order.shippingInfo?.address}{order.shippingInfo?.city ? `, ${order.shippingInfo.city}` : ''}{order.shippingInfo?.pincode ? ` - ${order.shippingInfo.pincode}` : ''}</p>
                <p className="flex items-center gap-1"><HiPhone className="w-3 h-3" /> {order.shippingInfo?.phone}</p>
                {order.note && <p><span className="font-medium">Note:</span> {order.note}</p>}
              </div>
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="flex gap-2 pt-1">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdateOrderStatus(order._id, 'confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium transition-colors">Confirm</button>
                      <button onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors">Cancel</button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => handleUpdateOrderStatus(order._id, 'shipped')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors">Mark Shipped</button>
                  )}
                  {order.status === 'shipped' && (
                    <button onClick={() => handleUpdateOrderStatus(order._id, 'delivered')} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">Mark Delivered</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════ TAB: PLAYLISTS ════════ */}
      {tab === 'playlists' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => setShowPlaylistModal(true)} className="btn-primary text-sm flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Create Playlist
            </button>
          )}
          {playlists.length === 0 && <p className="text-center text-gray-500 py-10">No playlists yet</p>}
          {playlists.map(pl => (
            <div key={pl._id} className="card flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <HiMusicalNote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{pl.title}</h3>
                <p className="text-xs text-gray-500">{pl.songs?.length || 0} songs</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ TAB: COMMUNITY ════════ */}
      {tab === 'community' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateDiscussion} className="card flex gap-2">
            <input type="text" value={newDiscussion} onChange={e => setNewDiscussion(e.target.value)}
              className="input-field flex-1 py-2 text-sm" placeholder="Start a discussion..." />
            <button type="submit" className="btn-primary text-sm px-4">Post</button>
          </form>
          {discussions.length === 0 && <p className="text-center text-gray-500 py-10">No discussions yet</p>}
          {discussions.map(disc => (
            <div key={disc._id} className="card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-hover overflow-hidden">
                  {disc.user?.profilePhoto && <img src={disc.user.profilePhoto} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <span className="text-sm font-semibold">{disc.user?.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{new Date(disc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm">{disc.text}</p>
              <div className="flex items-center gap-4">
                <button onClick={() => handleLikeDiscussion(disc._id)}
                  className={`flex items-center gap-1 text-xs ${disc.likes?.includes(user._id) ? 'text-primary' : 'text-gray-500'}`}>
                  <HiHandThumbUp className="w-4 h-4" /> {disc.likes?.length || 0}
                </button>
                <button onClick={() => setShowReplyFor(showReplyFor === disc._id ? null : disc._id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary">
                  <HiChatBubbleLeft className="w-4 h-4" /> {disc.replies?.length || 0} replies
                </button>
              </div>
              {/* Replies */}
              {(showReplyFor === disc._id || disc.replies?.length > 0) && (
                <div className="pl-6 border-l-2 border-gray-100 dark:border-dark-border space-y-2 mt-2">
                  {disc.replies?.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-hover flex-shrink-0 overflow-hidden">
                        {r.user?.profilePhoto && <img src={r.user.profilePhoto} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <span className="text-xs font-semibold">{r.user?.name}</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{r.text}</p>
                      </div>
                    </div>
                  ))}
                  {showReplyFor === disc._id && (
                    <form onSubmit={e => handleReplyDiscussion(e, disc._id)} className="flex gap-2">
                      <input type="text" value={replyText[disc._id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [disc._id]: e.target.value }))}
                        className="input-field flex-1 py-1 text-xs" placeholder="Write a reply..." />
                      <button type="submit" className="text-primary font-semibold text-xs">Reply</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════ TAB: ANALYTICS ════════ */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Followers', value: analytics.totalFollowers, color: 'from-blue-500 to-cyan-500' },
              { label: 'Posts', value: analytics.totalPosts, color: 'from-purple-500 to-pink-500' },
              { label: 'Total Likes', value: analytics.totalLikes, color: 'from-red-500 to-orange-500' },
              { label: 'Engagement', value: analytics.engagement + '/post', color: 'from-green-500 to-emerald-500' },
            ].map(stat => (
              <div key={stat.label} className="card text-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <HiChartBar className="w-5 h-5 text-white" />
                </div>
                <p className="text-xl font-extrabold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          {analytics.topPosts?.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-sm mb-3">Top Posts</h3>
              <div className="space-y-2">
                {analytics.topPosts.map(p => (
                  <div key={p._id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-dark-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.caption || '(no caption)'}</p>
                      <span className="text-xs text-gray-500">{p.type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <HiHeart className="w-4 h-4" /> {p.likes?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* Create Post Modal */}
      <Modal isOpen={showPostModal} onClose={() => setShowPostModal(false)} title="Create Page Post" size="md">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-2">
            {['text', 'photo', 'reel', 'music'].map(t => (
              <button key={t} type="button" onClick={() => setPostType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${postType === t ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-elevated text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea value={postCaption} onChange={e => setPostCaption(e.target.value)}
            className="input-field w-full" placeholder="Write something..." rows={3} />
          {postType !== 'text' && (
            <FileDropzone
              onDrop={files => setPostFile(files[0])}
              accept={
                postType === 'photo' ? { 'image/*': ['.jpg', '.png', '.gif', '.webp'] } :
                postType === 'music' ? { 'audio/*': ['.mp3', '.wav', '.ogg'] } :
                { 'video/*': ['.mp4', '.mov', '.webm'] }
              }
              label={`Drop your ${postType} here`}>
              {postFile && <p className="text-sm text-primary">{postFile.name}</p>}
            </FileDropzone>
          )}
          <button type="submit" disabled={posting} className="btn-primary w-full disabled:opacity-50">
            {posting ? 'Posting...' : 'Create Post'}
          </button>
        </form>
      </Modal>

      {/* Story Modal */}
      <Modal isOpen={showStoryModal} onClose={() => setShowStoryModal(false)} title="Add Story" size="md">
        <div className="space-y-4">
          <FileDropzone onDrop={files => setStoryFile(files[0])}
            accept={{ 'image/*': ['.jpg', '.png', '.gif'], 'video/*': ['.mp4', '.mov'] }}
            label="Drop story media">
            {storyFile && <p className="text-sm text-primary">{storyFile.name}</p>}
          </FileDropzone>
          <button onClick={handleCreateStory} disabled={uploadingStory || !storyFile} className="btn-primary w-full disabled:opacity-50">
            {uploadingStory ? 'Uploading...' : 'Add Story'}
          </button>
        </div>
      </Modal>

      {/* Event Modal */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title="Create Event" size="md">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <input type="text" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
            className="input-field w-full" placeholder="Event title" required />
          <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
            className="input-field w-full" placeholder="Description" rows={2} />
          <input type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })}
            className="input-field w-full" required />
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Event Link (Meet/Zoom/etc.)</label>
            <input type="url" value={eventForm.eventLink} onChange={e => setEventForm({ ...eventForm, eventLink: e.target.value })}
              className="input-field w-full" placeholder="https://meet.google.com/..." />
          </div>
          <button type="submit" className="btn-primary w-full">Create Event</button>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title="Add Product" size="md">
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <FileDropzone onDrop={files => setProductFile(files[0])} accept={{ 'image/*': ['.jpg', '.png', '.webp'] }}
            label="Product image">
            {productFile && <p className="text-sm text-primary">{productFile.name}</p>}
          </FileDropzone>
          <input type="text" value={productForm.productName} onChange={e => setProductForm({ ...productForm, productName: e.target.value })}
            className="input-field w-full" placeholder="Product name" required />
          <input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })}
            className="input-field w-full" placeholder="Price" required min="0" step="0.01" />
          <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })}
            className="input-field w-full" placeholder="Description" rows={2} />
          <button type="submit" className="btn-primary w-full">Add Product</button>
        </form>
      </Modal>

      {/* Product Detail Modal */}
      <Modal isOpen={!!selectedProduct && !showBuyModal} onClose={() => setSelectedProduct(null)} title={selectedProduct?.productName || 'Product'} size="md">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-elevated">
              {selectedProduct.productImage ? (
                <img src={selectedProduct.productImage} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><HiShoppingBag className="w-16 h-16 text-gray-300" /></div>
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg">{selectedProduct.productName}</h2>
              <p className="text-primary font-extrabold text-2xl mt-1">₹{selectedProduct.price}</p>
              {selectedProduct.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{selectedProduct.description}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowBuyModal(true)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-base font-bold">
                <HiCreditCard className="w-5 h-5" /> Buy Now
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Buy Product Modal */}
      <Modal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} title="Place Order" size="md">
        {selectedProduct && (
          <form onSubmit={handleBuyProduct} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-hover flex-shrink-0">
                {selectedProduct.productImage ? <img src={selectedProduct.productImage} alt="" className="w-full h-full object-cover" /> : <HiShoppingBag className="w-7 h-7 text-gray-400 m-auto mt-3.5" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{selectedProduct.productName}</p>
                <p className="text-primary font-bold">₹{selectedProduct.price}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Quantity</label>
              <input type="number" min="1" value={buyForm.quantity} onChange={e => setBuyForm({ ...buyForm, quantity: parseInt(e.target.value) || 1 })}
                className="input-field w-full" />
              <p className="text-xs text-gray-400 mt-1">Total: ₹{selectedProduct.price * (buyForm.quantity || 1)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Full Name *</label>
              <input type="text" value={buyForm.fullName} onChange={e => setBuyForm({ ...buyForm, fullName: e.target.value })}
                className="input-field w-full" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Phone *</label>
              <input type="tel" value={buyForm.phone} onChange={e => setBuyForm({ ...buyForm, phone: e.target.value })}
                className="input-field w-full" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Delivery Address *</label>
              <textarea value={buyForm.address} onChange={e => setBuyForm({ ...buyForm, address: e.target.value })}
                className="input-field w-full" rows={2} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">City</label>
                <input type="text" value={buyForm.city} onChange={e => setBuyForm({ ...buyForm, city: e.target.value })}
                  className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Pincode</label>
                <input type="text" value={buyForm.pincode} onChange={e => setBuyForm({ ...buyForm, pincode: e.target.value })}
                  className="input-field w-full" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Note (optional)</label>
              <input type="text" value={buyForm.note} onChange={e => setBuyForm({ ...buyForm, note: e.target.value })}
                className="input-field w-full" placeholder="Any special instructions" />
            </div>

            <button type="submit" disabled={buying} className="btn-primary w-full py-3 text-base font-bold disabled:opacity-50">
              {buying ? 'Placing Order...' : `Place Order · ₹${selectedProduct.price * (buyForm.quantity || 1)}`}
            </button>
          </form>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Edit Product" size="md">
        {editingProduct && (
          <form onSubmit={handleEditProduct} className="space-y-4">
            <FileDropzone onDrop={files => setEditProductFile(files[0])} accept={{ 'image/*': ['.jpg', '.png', '.webp'] }}
              label="Change product image">
              {editProductFile ? <p className="text-sm text-primary">{editProductFile.name}</p> :
                editingProduct.productImage ? <img src={editingProduct.productImage} alt="" className="w-20 h-20 object-cover rounded-lg mx-auto" /> : null}
            </FileDropzone>
            <input type="text" value={editProductForm.productName} onChange={e => setEditProductForm({ ...editProductForm, productName: e.target.value })}
              className="input-field w-full" placeholder="Product name" required />
            <input type="number" value={editProductForm.price} onChange={e => setEditProductForm({ ...editProductForm, price: e.target.value })}
              className="input-field w-full" placeholder="Price" required min="0" step="0.01" />
            <textarea value={editProductForm.description} onChange={e => setEditProductForm({ ...editProductForm, description: e.target.value })}
              className="input-field w-full" placeholder="Description" rows={2} />
            <button type="submit" disabled={savingProduct} className="btn-primary w-full disabled:opacity-50">
              {savingProduct ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </Modal>

      {/* Playlist Modal */}
      <Modal isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} title="Create Playlist" size="sm">
        <div className="space-y-4">
          <input type="text" value={playlistTitle} onChange={e => setPlaylistTitle(e.target.value)}
            className="input-field w-full" placeholder="Playlist name" />
          <button onClick={handleCreatePlaylist} className="btn-primary w-full">Create Playlist</button>
        </div>
      </Modal>

      {/* Followers Modal */}
      <Modal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title={`Followers (${page.followers?.length || 0})`} size="sm">
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {(!page.followers || page.followers.length === 0) && (
            <p className="text-center text-gray-500 py-6 text-sm">No followers yet</p>
          )}
          {page.followers?.map(f => (
            <div key={f._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-hover flex-shrink-0">
                {f.profilePhoto ? (
                  <img src={f.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                    {f.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-semibold text-sm">{f.name}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Edit Page Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Page" size="md">
        <form onSubmit={handleEditPage} className="space-y-4">
          {/* Cover photo preview + change */}
          <div className={`h-28 rounded-xl bg-gradient-to-r ${categoryColors[editForm.category] || gradColor} relative overflow-hidden`}>
            {(editCoverPhoto || page.coverPhoto) && (
              <img src={editCoverPhoto ? URL.createObjectURL(editCoverPhoto) : page.coverPhoto} alt="" className="w-full h-full object-cover" />
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1">
                <HiPhoto className="w-3.5 h-3.5" /> Change Cover
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setEditCoverPhoto(e.target.files[0])} />
            </label>
          </div>

          {/* Profile photo */}
          <div className="flex items-center gap-3 -mt-8 ml-3 relative z-10">
            <div className="w-16 h-16 rounded-xl border-3 border-white dark:border-dark-card shadow-md overflow-hidden bg-white dark:bg-dark-card">
              {(editProfilePhoto || page.profilePhoto) ? (
                <img src={editProfilePhoto ? URL.createObjectURL(editProfilePhoto) : page.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradColor} flex items-center justify-center`}>
                  <CatIcon className="w-7 h-7 text-white" />
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs text-primary font-semibold hover:underline">
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={e => setEditProfilePhoto(e.target.files[0])} />
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Page Name</label>
            <input type="text" value={editForm.pageName} onChange={e => setEditForm({ ...editForm, pageName: e.target.value })}
              className="input-field w-full" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              className="input-field w-full">
              {['Music', 'Creator', 'Brand', 'Community', 'Education'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              className="input-field w-full" rows={3} maxLength={500} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Page" size="sm">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
            <HiTrash className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="font-semibold">Delete "{page.pageName}"?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This will permanently delete the page, all posts, stories, events, products, and discussions. This action cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-dark-elevated text-sm font-medium hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleDeletePage} disabled={deleting}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete Page'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PageDetail;
