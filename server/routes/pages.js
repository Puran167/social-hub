const router = require('express').Router();
const ctrl = require('../controllers/pageController');
const auth = require('../middleware/auth');
const { imageUpload, postMediaUpload } = require('../middleware/upload');
const multer = require('multer');

// Page create/update uses two image fields (profilePhoto + coverPhoto)
const pagePhotoUpload = multer({
  storage: imageUpload.storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 },
]);

const handlePagePhotoUpload = (req, res, next) => {
  pagePhotoUpload(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Upload error: ' + err.message });
    next();
  });
};

// Page post media (single file — photo/video/audio)
const pagePostUpload = multer({
  storage: postMediaUpload.storage,
  limits: { fileSize: 100 * 1024 * 1024 },
}).single('media');

const handlePagePostUpload = (req, res, next) => {
  pagePostUpload(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Upload error: ' + err.message });
    next();
  });
};

// Story / event cover / product image upload
const singleImageUpload = multer({
  storage: imageUpload.storage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('media');

const handleSingleUpload = (req, res, next) => {
  singleImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Upload error: ' + err.message });
    next();
  });
};

// ─── PAGE CRUD ───
router.post('/create', auth, handlePagePhotoUpload, ctrl.createPage);
router.get('/', auth, ctrl.getPages);
router.get('/my', auth, ctrl.getMyPages);
router.get('/:pageId', auth, ctrl.getPage);
router.put('/:pageId', auth, handlePagePhotoUpload, ctrl.updatePage);
router.delete('/:pageId', auth, ctrl.deletePage);

// ─── FOLLOW / UNFOLLOW ───
router.post('/:pageId/follow', auth, ctrl.followPage);
router.post('/:pageId/unfollow', auth, ctrl.unfollowPage);

// ─── PAGE POSTS ───
router.post('/:pageId/post', auth, handlePagePostUpload, ctrl.createPagePost);
router.get('/:pageId/posts', auth, ctrl.getPagePosts);
router.put('/posts/:postId/like', auth, ctrl.likePagePost);
router.post('/posts/:postId/comment', auth, ctrl.commentPagePost);
router.delete('/posts/:postId', auth, ctrl.deletePagePost);

// ─── PAGE STORIES ───
router.post('/:pageId/story', auth, handleSingleUpload, ctrl.createPageStory);
router.get('/:pageId/stories', auth, ctrl.getPageStories);

// ─── PAGE MESSAGES ───
router.post('/:pageId/message', auth, ctrl.sendPageMessage);
router.get('/:pageId/messages', auth, ctrl.getPageMessages);

// ─── PAGE PLAYLISTS ───
router.post('/:pageId/playlist', auth, ctrl.createPagePlaylist);
router.get('/:pageId/playlists', auth, ctrl.getPagePlaylists);

// ─── PAGE EVENTS ───
router.post('/:pageId/event', auth, handleSingleUpload, ctrl.createPageEvent);
router.get('/:pageId/events', auth, ctrl.getPageEvents);
router.post('/events/:eventId/join', auth, ctrl.joinEvent);
router.delete('/events/:eventId', auth, ctrl.deleteEvent);

// ─── PAGE ANALYTICS ───
router.get('/:pageId/analytics', auth, ctrl.getPageAnalytics);

// ─── VERIFICATION ───
router.put('/:pageId/verify', auth, ctrl.verifyPage);

// ─── ADMIN ROLES ───
router.post('/:pageId/admin', auth, ctrl.addAdmin);
router.delete('/:pageId/admin/:userId', auth, ctrl.removeAdmin);

// ─── PAGE SHOP ───
router.post('/:pageId/product', auth, handleSingleUpload, ctrl.createProduct);
router.get('/:pageId/products', auth, ctrl.getProducts);
router.get('/product/:productId', auth, ctrl.getProduct);
router.put('/product/:productId', auth, handleSingleUpload, ctrl.updateProduct);
router.delete('/product/:productId', auth, ctrl.deleteProduct);
router.post('/product/:productId/buy', auth, ctrl.buyProduct);
router.get('/:pageId/orders', auth, ctrl.getPageOrders);
router.get('/:pageId/my-orders', auth, ctrl.getMyOrders);
router.put('/order/:orderId/status', auth, ctrl.updateOrderStatus);

// ─── PAGE COMMUNITY ───
router.post('/:pageId/discussion', auth, ctrl.createDiscussion);
router.get('/:pageId/discussions', auth, ctrl.getDiscussions);
router.post('/discussions/:discId/reply', auth, ctrl.replyDiscussion);
router.put('/discussions/:discId/like', auth, ctrl.likeDiscussion);

module.exports = router;
