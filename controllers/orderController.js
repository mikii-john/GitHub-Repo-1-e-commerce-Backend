const Order = require('../models/Order');
const Product = require('../models/Product');
const { releasePayment } = require('./paymentController');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Buyer
const createOrder = async (req, res) => {
  const { product_id, quantity } = req.body;

  try {
    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const total_amount = product.price * quantity;

    const order = await Order.create({
      buyer_id: req.user._id,
      seller_id: product.seller_id,
      product_id,
      quantity,
      total_amount,
    });

    // Reduce product stock
    product.stock -= quantity;
    await product.save();

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get buyer orders
// @route   GET /api/orders/buyer
// @access  Private/Buyer
const getBuyerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer_id: req.user._id })
      .populate('product_id', 'name price image')
      .populate('seller_id', 'name email');
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get seller orders
// @route   GET /api/orders/seller
// @access  Private/Seller
const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller_id: req.user._id })
      .populate('product_id', 'name price image')
      .populate('buyer_id', 'name email');
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Ship order and add tracking number
// @route   PUT /api/orders/:id/ship
// @access  Private/Seller
const shipOrder = async (req, res) => {
  try {
    const { tracking_number } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the seller
    if (order.seller_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the seller can ship this order' });
    }

    if (order.status !== 'Paid') {
      return res.status(400).json({ message: 'Order must be Paid to be shipped' });
    }

    if (!tracking_number) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }

    order.tracking_number = tracking_number;
    order.status = 'Shipped';
    await order.save();

    res.status(200).json({ message: 'Order shipped successfully', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during shipping' });
  }
};

// @desc    Confirm delivery and release payment
// @route   PUT /api/orders/:id/confirm-delivery
// @access  Private/Buyer
const confirmDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the user is the buyer
    if (order.buyer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm delivery' });
    }

    // Check if order status is appropriate (Paid or Shipped)
    if (order.status !== 'Paid' && order.status !== 'Shipped') {
      return res.status(400).json({ message: 'Order must be Paid or Shipped to confirm delivery' });
    }

    // Release payment via escrow logic
    const success = await releasePayment(order._id);

    if (success) {
      order.status = 'Delivered';
      await order.save();
      res.status(200).json({ message: 'Delivery confirmed and payment released' });
    } else {
      res.status(400).json({ message: 'Payment release failed. Please contact support.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during delivery confirmation' });
  }
};

module.exports = {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  confirmDelivery,
  shipOrder,
};
