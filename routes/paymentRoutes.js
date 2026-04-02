const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/payments/initialize/:orderId
// @desc    Initialize Chapa payment
// @access  Private
router.post('/initialize/:orderId', protect, initializePayment);

// @route   GET /api/payments/verify/:tx_ref
// @desc    Verify Chapa payment
// @access  Public (Callback from Chapa)
router.get('/verify/:tx_ref', verifyPayment);

module.exports = router;
