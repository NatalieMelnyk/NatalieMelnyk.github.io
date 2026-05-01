const express = require('express')
const router = express.Router()
const {
  getProducts,
  getPublicProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController')
const { protect } = require('../middleware/authMiddleware')

// Public marketing endpoint
router.get('/public', getPublicProducts)

// Admin endpoints — protected
router.route('/')
  .get(protect, getProducts)
  .post(protect, createProduct)

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct)

module.exports = router