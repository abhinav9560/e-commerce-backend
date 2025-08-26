const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation middleware for cart operations
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50')
];

const validateUpdateCartItem = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 0, max: 50 })
    .withMessage('Quantity must be between 0 and 50')
];

// All cart routes require authentication
router.use(authenticateToken);

// Cart CRUD operations
router.get('/', cartController.getCart); // Get user's cart
router.post('/add', validateAddToCart, cartController.addToCart); // Add item to cart
router.put('/update', validateUpdateCartItem, cartController.updateCartItem); // Update cart item quantity
router.delete('/remove/:productId', cartController.removeFromCart); // Remove item from cart
router.delete('/clear', cartController.clearCart); // Clear entire cart

// Cart utilities
router.get('/count', cartController.getCartCount); // Get cart item count
router.post('/validate', cartController.validateCart); // Validate cart before checkout

module.exports = router;