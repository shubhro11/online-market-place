const cartModel = require("../models/cart.model");

// Get User Cart
async function getCart(req, res) {
  const user = req.user;

  try {
    let cart = await cartModel.findOne({ userId: user.id });

    if (!cart) {
      cart = new cartModel({ userId: user.id, items: [] });
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      cart,
      totals: {
        itemCount: cart.items.length,
        totalQuantity: cart.items.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Add Items to Cart
async function addItemToCart(req, res) {
  const { productId, qty } = req.body;
  const user = req.user;

  try {
    let cart = await cartModel.findOne({ userId: user.id });

    if (!cart) {
      cart = new cartModel({ userId: user.id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    existingItemIndex >= 0
      ? (cart.items[existingItemIndex].quantity += qty)
      : cart.items.push({ productId, quantity: qty });

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Update Item Quantity
async function updateItemQuantity(req, res) {
  const { productId } = req.params;
  const { qty } = req.body;
  const user = req.user;

  try {
    const cart = await cartModel.findOne({ user: user.id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

    if (existingItemIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    cart.items[existingItemIndex].quantity = qty;
    await cart.save();

    return res.status(200).json({ message: "Item updated", cart });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getCart,
  addItemToCart,
  updateItemQuantity,
};
