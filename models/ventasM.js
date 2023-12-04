const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  Usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  Producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  fecha: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Venta', ventaSchema);
