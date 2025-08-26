const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
    max: [50, "Quantity cannot exceed 50"],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    sessionId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });

// Method to calculate totals
cartSchema.methods.calculateTotals = function () {
  this.totalItems = this.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  this.totalAmount = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  this.totalAmount = Math.round(this.totalAmount * 100) / 100; // Round to 2 decimal places
  this.lastUpdated = new Date();
  return this;
};

// Method to add item to cart
cartSchema.methods.addItem = function (productId, quantity, price) {
  const existingItemIndex = this.items.findIndex((item) => {
    // Handle both populated and non-populated product references
    const itemProductId = item.product._id || item.product;
    return itemProductId.toString() === productId.toString();
  });

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].price = price;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      quantity,
      price,
    });
  }

  return this.calculateTotals();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function (productId, quantity) {
  const itemIndex = this.items.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    return this.calculateTotals();
  }

  throw new Error("Item not found in cart");
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (productId) {
  const itemIndex = this.items.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    this.items.splice(itemIndex, 1);
    return this.calculateTotals();
  }

  throw new Error("Item not found in cart");
};

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.totalAmount = 0;
  this.totalItems = 0;
  this.lastUpdated = new Date();
  return this;
};

// Method to get item by product ID
cartSchema.methods.getItem = function (productId) {
  return this.items.find((item) => {
    const itemProductId = item.product._id || item.product;
    return itemProductId.toString() === productId.toString();
  });
};

// Static method to find or create cart for user
cartSchema.statics.findOrCreateForUser = async function (userId) {
  let cart = await this.findOne({ user: userId }).populate("items.product");

  if (!cart) {
    cart = new this({ user: userId, items: [] });
    await cart.save();
    cart = await this.findOne({ user: userId }).populate("items.product");
  }

  return cart;
};

// Pre-save middleware to update totals
cartSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.calculateTotals();
  }
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
