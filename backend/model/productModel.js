const mongoose = require('mongoose')

const productSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['plan', 'feature'],
      required: [true, 'Type must be "plan" or "feature"'],
    },
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    price: { type: String },
    description: { type: String },
    feats: [{ type: String }],
    addedBy: { type: String },
  },
  {
    timestamps: true,
    collection: 'buddyData'
  }
)

module.exports = mongoose.model('Product', productSchema)