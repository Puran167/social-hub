const Post = require('../models/Post');
const User = require('../models/User');

// Create a post (supports text, image, video, song attachments)
exports.createPost = async (req, res) => {
  try {
    const { text, songUrl, songTitle } = req.body;
    const postData = { user: req.user._id, text: text || '' };

    if (req.files?.image?.[0]) {
      postData.imageUrl = req.files.image[0].path;
      postData.cloudinaryId = req.files.image[0].filename;
      postData.type = 'image';
    }
    if (req.files?.video?.[0]) {
      postData.videoUrl = req.files.video[0].path;
      postData.cloudinaryId = req.files.video[0].filename;
      postData.type = 'video';
    }
    // Audio file upload takes priority over songUrl body field
    if (req.files?.audio?.[0]) {
      postData.songUrl = req.files.audio[0].path;
      postData.songTitle = songTitle || req.files.audio[0].originalname || '';
      postData.type = postData.imageUrl || postData.videoUrl ? 'mixed' : 'music';
    } else if (songUrl) {
      postData.songUrl = songUrl;
      postData.songTitle = songTitle || '';
      postData.type = postData.imageUrl || postData.videoUrl ? 'mixed' : 'music';
    }
    if (!postData.imageUrl && !postData.videoUrl && !postData.songUrl) {
      postData.type = 'text';
    }
    if ((postData.imageUrl || postData.videoUrl) && postData.songUrl) {
      postData.type = 'mixed';
    }

    const post = await Post.create(postData);
    const populated = await Post.findById(post._id)
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get activity feed — posts from friends + own posts, sorted newest first
exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id).select('friends');
    const feedUsers = [req.user._id, ...(currentUser.friends || [])];

    const posts = await Post.find({ user: { $in: feedUsers } })
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .populate('likes', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ user: { $in: feedUsers } });

    res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + posts.length < total,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get a single post
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .populate('likes', 'name profilePhoto');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get posts by a specific user
exports.getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: req.params.userId })
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ user: req.params.userId });
    res.json({ posts, hasMore: skip + posts.length < total });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a post (owner only)
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { text, songUrl, songTitle, removeImage, removeSong } = req.body;
    if (text !== undefined) post.text = text;
    if (songUrl !== undefined) { post.songUrl = songUrl; post.songTitle = songTitle || ''; }
    if (removeSong === 'true') { post.songUrl = ''; post.songTitle = ''; }

    if (req.files?.image?.[0]) {
      post.imageUrl = req.files.image[0].path;
      post.cloudinaryId = req.files.image[0].filename;
    }
    if (removeImage === 'true') { post.imageUrl = ''; }

    // Recalculate type
    if (post.imageUrl || post.videoUrl) {
      post.type = post.songUrl ? 'mixed' : (post.videoUrl ? 'video' : 'image');
    } else if (post.songUrl) {
      post.type = 'music';
    } else {
      post.type = 'text';
    }

    await post.save();
    const populated = await Post.findById(post._id)
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a post (owner only)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Like / unlike a post
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const idx = post.likes.indexOf(req.user._id);
    if (idx > -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(req.user._id);
      if (post.user.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        const sendNotification = require('../utils/sendNotification');
        await sendNotification(io, {
          recipient: post.user, sender: req.user._id,
          type: 'post_like', content: `${req.user.name} liked your post`,
          referenceId: post._id, referenceModel: 'Post',
        });
      }
    }
    await post.save();
    res.json({ likes: post.likes, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Add a comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ user: req.user._id, text });
    await post.save();
    if (post.user.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      const sendNotification = require('../utils/sendNotification');
      await sendNotification(io, {
        recipient: post.user, sender: req.user._id,
        type: 'post_comment', content: `${req.user.name} commented on your post`,
        referenceId: post._id, referenceModel: 'Post',
      });
    }
    const populated = await Post.findById(post._id)
      .populate('comments.user', 'name profilePhoto');
    res.json(populated.comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a comment (comment owner or post owner)
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString() && post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    post.comments.pull(req.params.commentId);
    await post.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
