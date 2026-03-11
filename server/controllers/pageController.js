const Page = require('../models/Page');
const PagePost = require('../models/PagePost');
const PageStory = require('../models/PageStory');
const PageMessage = require('../models/PageMessage');
const PagePlaylist = require('../models/PagePlaylist');
const PageEvent = require('../models/PageEvent');
const PageProduct = require('../models/PageProduct');
const PageOrder = require('../models/PageOrder');
const PageDiscussion = require('../models/PageDiscussion');

// ─── HELPER: check if user is admin of page ───
const isPageAdmin = (page, userId) => {
  const uid = userId.toString();
  if (page.creator.toString() === uid) return true;
  return page.admins.some(a => a.user.toString() === uid);
};

// ═══════════════════════════════════════════
// FEATURE 1: CREATE / GET PAGES
// ═══════════════════════════════════════════

exports.createPage = async (req, res) => {
  try {
    const { pageName, category, description } = req.body;
    const profilePhoto = req.files?.profilePhoto?.[0]?.path || '';
    const coverPhoto = req.files?.coverPhoto?.[0]?.path || '';
    const page = await Page.create({
      pageName, category, description, profilePhoto, coverPhoto,
      creator: req.user._id,
      admins: [{ user: req.user._id, role: 'Owner' }],
    });
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPages = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    const pages = await Page.find(query)
      .populate('creator', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Page.countDocuments(query);
    res.json({ pages, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyPages = async (req, res) => {
  try {
    const pages = await Page.find({
      $or: [
        { creator: req.user._id },
        { 'admins.user': req.user._id },
      ],
    }).populate('creator', 'name profilePhoto').sort({ createdAt: -1 });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId)
      .populate('creator', 'name profilePhoto')
      .populate('admins.user', 'name profilePhoto')
      .populate('followers', 'name profilePhoto');
    if (!page) return res.status(404).json({ message: 'Page not found' });
    const postCount = await PagePost.countDocuments({ page: page._id });
    res.json({ ...page.toObject(), postCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updatePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const { pageName, category, description } = req.body;
    if (pageName) page.pageName = pageName;
    if (category) page.category = category;
    if (description !== undefined) page.description = description;
    if (req.files?.profilePhoto?.[0]) page.profilePhoto = req.files.profilePhoto[0].path;
    if (req.files?.coverPhoto?.[0]) page.coverPhoto = req.files.coverPhoto[0].path;
    await page.save();
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 2: FOLLOW / UNFOLLOW
// ═══════════════════════════════════════════

exports.followPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!page.followers.includes(req.user._id)) {
      page.followers.push(req.user._id);
      await page.save();
    }
    res.json({ followers: page.followers.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.unfollowPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    page.followers = page.followers.filter(f => f.toString() !== req.user._id.toString());
    await page.save();
    res.json({ followers: page.followers.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 3: PAGE POSTS
// ═══════════════════════════════════════════

exports.createPagePost = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const mediaUrl = req.file?.path || '';
    const post = await PagePost.create({
      page: page._id,
      author: req.user._id,
      type: req.body.type || 'text',
      caption: req.body.caption || '',
      mediaUrl,
      cloudinaryId: req.file?.filename || '',
    });
    const populated = await PagePost.findById(post._id)
      .populate('author', 'name profilePhoto')
      .populate('page', 'pageName profilePhoto verified');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPagePosts = async (req, res) => {
  try {
    const posts = await PagePost.find({ page: req.params.pageId })
      .populate('author', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .populate('page', 'pageName profilePhoto verified')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likePagePost = async (req, res) => {
  try {
    const post = await PagePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const idx = post.likes.indexOf(req.user._id);
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(req.user._id);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.commentPagePost = async (req, res) => {
  try {
    const post = await PagePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ user: req.user._id, text: req.body.text });
    await post.save();
    const updated = await PagePost.findById(post._id)
      .populate('author', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deletePagePost = async (req, res) => {
  try {
    const post = await PagePost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const page = await Page.findById(post.page);
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 4: PAGE STORIES
// ═══════════════════════════════════════════

exports.createPageStory = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    if (!req.file) return res.status(400).json({ message: 'No media file' });
    const story = await PageStory.create({
      page: page._id,
      author: req.user._id,
      mediaUrl: req.file.path,
      cloudinaryId: req.file.filename,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPageStories = async (req, res) => {
  try {
    const stories = await PageStory.find({
      page: req.params.pageId,
      expiresAt: { $gt: new Date() },
    }).populate('author', 'name profilePhoto').sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 5: PAGE MESSAGING
// ═══════════════════════════════════════════

exports.sendPageMessage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    const msg = await PageMessage.create({
      page: page._id,
      sender: req.user._id,
      message: req.body.message,
      isFromPage: isPageAdmin(page, req.user._id),
    });
    const populated = await PageMessage.findById(msg._id).populate('sender', 'name profilePhoto');
    const io = req.app.get('io');
    io.to(`page-${page._id}`).emit('page-message', populated);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPageMessages = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    const query = { page: page._id };
    // Non-admins only see their own conversation
    if (!isPageAdmin(page, req.user._id)) {
      query.sender = req.user._id;
    }
    const messages = await PageMessage.find(query)
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 6: PAGE PLAYLISTS (Music pages)
// ═══════════════════════════════════════════

exports.createPagePlaylist = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const playlist = await PagePlaylist.create({
      page: page._id,
      title: req.body.title,
      songs: req.body.songs || [],
      coverArt: req.body.coverArt || '',
    });
    res.status(201).json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPagePlaylists = async (req, res) => {
  try {
    const playlists = await PagePlaylist.find({ page: req.params.pageId }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 7: PAGE EVENTS
// ═══════════════════════════════════════════

exports.createPageEvent = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const event = await PageEvent.create({
      page: page._id,
      title: req.body.title,
      description: req.body.description || '',
      eventDate: req.body.eventDate,
      coverImage: req.file?.path || '',
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPageEvents = async (req, res) => {
  try {
    const events = await PageEvent.find({ page: req.params.pageId })
      .populate('participants', 'name profilePhoto')
      .sort({ eventDate: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.joinEvent = async (req, res) => {
  try {
    const event = await PageEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const idx = event.participants.indexOf(req.user._id);
    if (idx > -1) event.participants.splice(idx, 1);
    else event.participants.push(req.user._id);
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 8: PAGE ANALYTICS
// ═══════════════════════════════════════════

exports.getPageAnalytics = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });

    const totalFollowers = page.followers.length;
    const posts = await PagePost.find({ page: page._id });
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + p.likes.length, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);
    const engagement = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(1) : 0;
    const topPosts = posts.sort((a, b) => b.likes.length - a.likes.length).slice(0, 5);

    res.json({ totalFollowers, totalPosts, totalLikes, totalComments, engagement, topPosts });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 9: VERIFICATION (admin-only)
// ═══════════════════════════════════════════

exports.verifyPage = async (req, res) => {
  try {
    const page = await Page.findByIdAndUpdate(
      req.params.pageId,
      { verified: true },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 10: ADMIN ROLES
// ═══════════════════════════════════════════

exports.addAdmin = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only page owner can add admins' });
    }
    const { userId, role } = req.body;
    const exists = page.admins.find(a => a.user.toString() === userId);
    if (exists) {
      exists.role = role || 'Admin';
    } else {
      page.admins.push({ user: userId, role: role || 'Admin' });
    }
    await page.save();
    const updated = await Page.findById(page._id).populate('admins.user', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeAdmin = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only page owner can remove admins' });
    }
    page.admins = page.admins.filter(a => a.user.toString() !== req.params.userId);
    await page.save();
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 11: PAGE SHOP
// ═══════════════════════════════════════════

exports.createProduct = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const product = await PageProduct.create({
      page: page._id,
      productName: req.body.productName,
      price: parseFloat(req.body.price),
      description: req.body.description || '',
      productImage: req.file?.path || '',
      cloudinaryId: req.file?.filename || '',
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await PageProduct.find({ page: req.params.pageId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await PageProduct.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await PageProduct.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const page = await Page.findById(product.page);
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    product.productName = req.body.productName || product.productName;
    product.price = req.body.price ? parseFloat(req.body.price) : product.price;
    product.description = req.body.description ?? product.description;
    if (req.file) { product.productImage = req.file.path; product.cloudinaryId = req.file.filename; }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await PageProduct.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const page = await Page.findById(product.page);
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    await PageOrder.deleteMany({ product: product._id });
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.buyProduct = async (req, res) => {
  try {
    const product = await PageProduct.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { fullName, phone, address, city, pincode, note } = req.body;
    if (!fullName || !phone || !address) return res.status(400).json({ message: 'Name, phone and address are required' });
    const quantity = Math.max(1, parseInt(req.body.quantity) || 1);
    const order = await PageOrder.create({
      page: product.page, product: product._id, buyer: req.user._id,
      quantity, totalPrice: product.price * quantity,
      shippingInfo: { fullName, phone, address, city: city || '', pincode: pincode || '' },
      note: note || '',
    });
    const populated = await PageOrder.findById(order._id)
      .populate('buyer', 'name avatar')
      .populate('product', 'productName price productImage');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPageOrders = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const orders = await PageOrder.find({ page: page._id }).sort({ createdAt: -1 })
      .populate('buyer', 'name avatar')
      .populate('product', 'productName price productImage');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await PageOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const page = await Page.findById(order.page);
    if (!isPageAdmin(page, req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    order.status = req.body.status;
    await order.save();
    const populated = await PageOrder.findById(order._id)
      .populate('buyer', 'name avatar')
      .populate('product', 'productName price productImage');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await PageOrder.find({ buyer: req.user._id, page: req.params.pageId }).sort({ createdAt: -1 })
      .populate('product', 'productName price productImage');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// FEATURE 12: PAGE COMMUNITY / DISCUSSIONS
// ═══════════════════════════════════════════

exports.createDiscussion = async (req, res) => {
  try {
    const disc = await PageDiscussion.create({
      page: req.params.pageId,
      user: req.user._id,
      text: req.body.text,
    });
    const populated = await PageDiscussion.findById(disc._id)
      .populate('user', 'name profilePhoto');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDiscussions = async (req, res) => {
  try {
    const discussions = await PageDiscussion.find({ page: req.params.pageId })
      .populate('user', 'name profilePhoto')
      .populate('replies.user', 'name profilePhoto')
      .sort({ createdAt: -1 });
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.replyDiscussion = async (req, res) => {
  try {
    const disc = await PageDiscussion.findById(req.params.discId);
    if (!disc) return res.status(404).json({ message: 'Discussion not found' });
    disc.replies.push({ user: req.user._id, text: req.body.text });
    await disc.save();
    const updated = await PageDiscussion.findById(disc._id)
      .populate('user', 'name profilePhoto')
      .populate('replies.user', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likeDiscussion = async (req, res) => {
  try {
    const disc = await PageDiscussion.findById(req.params.discId);
    if (!disc) return res.status(404).json({ message: 'Discussion not found' });
    const idx = disc.likes.indexOf(req.user._id);
    if (idx > -1) disc.likes.splice(idx, 1);
    else disc.likes.push(req.user._id);
    await disc.save();
    res.json(disc);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ═══════════════════════════════════════════
// DELETE PAGE
// ═══════════════════════════════════════════

exports.deletePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only page creator can delete the page' });
    }
    // Clean up all related data
    await Promise.all([
      PagePost.deleteMany({ page: page._id }),
      PageStory.deleteMany({ page: page._id }),
      PageMessage.deleteMany({ page: page._id }),
      PagePlaylist.deleteMany({ page: page._id }),
      PageEvent.deleteMany({ page: page._id }),
      PageProduct.deleteMany({ page: page._id }),
      PageDiscussion.deleteMany({ page: page._id }),
    ]);
    await page.deleteOne();
    res.json({ message: 'Page deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
