const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOrCreateForUser(userId);

    // Validate cart items and update prices
    let cartUpdated = false;
    const validItems = [];

    for (const item of cart.items) {
      const product = item.product;
      
      if (!product || product.status !== 'active') {
        cartUpdated = true;
        continue; // Skip inactive/deleted products
      }

      // Check stock availability
      if (!product.isInStock(item.quantity)) {
        item.quantity = Math.min(item.quantity, product.stock);
        if (item.quantity === 0) {
          cartUpdated = true;
          continue; // Skip out of stock items
        }
        cartUpdated = true;
      }

      // Update price if it changed
      const currentPrice = product.discountedPrice || product.price;
      if (item.price !== currentPrice) {
        item.price = currentPrice;
        cartUpdated = true;
      }

      validItems.push(item);
    }

    if (cartUpdated) {
      cart.items = validItems;
      cart.calculateTotals();
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (quantity < 1 || quantity > 50) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 50'
      });
    }

    // Check if product exists and is available
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Get or create cart
    const cart = await Cart.findOrCreateForUser(userId);

    // Check existing item
    const existingItem = cart.getItem(productId);
    const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    // Check stock availability
    if (!product.isInStock(totalQuantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Add item to cart
    const price = product.discountedPrice || product.price;
    cart.addItem(productId, quantity, price);
    
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
};

// Update item quantity in cart
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (quantity < 0 || quantity > 50) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 0 and 50'
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // If quantity is 0, remove the item
    if (quantity === 0) {
      cart.removeItem(productId);
    } else {
      // Check stock availability
      const item = cart.getItem(productId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      const product = item.product;
      if (!product.isInStock(quantity)) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`
        });
      }

      cart.updateItemQuantity(productId, quantity);
    }

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    
    if (error.message === 'Item not found in cart') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update cart'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.removeItem(productId);
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    if (error.message === 'Item not found in cart') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.clearCart();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
};

// Get cart item count
const getCartCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    
    const count = cart ? cart.totalItems : 0;

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart count'
    });
  }
};

// Validate cart before checkout
const validateCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const validationErrors = [];
    let cartUpdated = false;

    // Validate each item
    for (let i = cart.items.length - 1; i >= 0; i--) {
      const item = cart.items[i];
      const product = item.product;

      // Check if product still exists and is active
      if (!product || product.status !== 'active') {
        cart.items.splice(i, 1);
        cartUpdated = true;
        validationErrors.push({
          productId: item.product?._id || 'unknown',
          issue: 'Product no longer available'
        });
        continue;
      }

      // Check stock availability
      if (!product.isInStock(item.quantity)) {
        if (product.stock === 0) {
          cart.items.splice(i, 1);
          cartUpdated = true;
          validationErrors.push({
            productId: product._id,
            productName: product.title,
            issue: 'Out of stock'
          });
        } else {
          item.quantity = product.stock;
          cartUpdated = true;
          validationErrors.push({
            productId: product._id,
            productName: product.title,
            issue: `Quantity reduced to ${product.stock} (maximum available)`
          });
        }
      }

      // Update price if changed
      const currentPrice = product.discountedPrice || product.price;
      if (item.price !== currentPrice) {
        item.price = currentPrice;
        cartUpdated = true;
        validationErrors.push({
          productId: product._id,
          productName: product.title,
          issue: `Price updated to ${currentPrice}`
        });
      }
    }

    if (cartUpdated) {
      cart.calculateTotals();
      await cart.save();
    }

    const response = {
      success: true,
      valid: validationErrors.length === 0,
      data: cart,
      message: validationErrors.length === 0 
        ? 'Cart is valid for checkout' 
        : 'Cart has been updated due to product changes'
    };

    if (validationErrors.length > 0) {
      response.validationErrors = validationErrors;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  validateCart
};