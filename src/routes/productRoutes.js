const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation middleware for products
const validateProduct = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['Electronics', 'Fashion', 'Home & Living', 'Books', 'Sports', 'Beauty'])
    .withMessage('Invalid category'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand name cannot exceed 100 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Each image must have a valid URL'),
];

const validateStockUpdate = [
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('operation')
    .optional()
    .isIn(['set', 'increase', 'decrease'])
    .withMessage('Operation must be set, increase, or decrease')
];

// Public Routes (no authentication required)
router.get('/', productController.getProducts); // Get all products with filtering
router.get('/featured', productController.getFeaturedProducts); // Get featured products
router.get('/trending', productController.getTrendingProducts); // Get trending products
router.get('/:id', productController.getProduct); // Get single product

// Public CRUD operations (as per requirement)
router.post('/', validateProduct, productController.createProduct); // Create product
router.put('/:id', validateProduct, productController.updateProduct); // Update product
router.delete('/:id', productController.deleteProduct); // Delete product
router.patch('/:id/stock', validateStockUpdate, productController.updateStock); // Update stock

module.exports = router;