const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema({
  nombreProducto: {
    type: String,
    required: true,
  },
  talla: {
    type: String,
    required: true,
    enum: ["Chica", "Mediana", "Grande", "Extragrande"],
  },
  marca: {
    type: String,
    required: true,
    required: [true, "La marca no puede estar vacía"],
  },
  categoria: {
    type: String,
    required: true,
    enum: ["Hombre", "Mujer"],
  },
  cantidad: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => !isNaN(value),
      message: "La cantidad debe ser un número",
    },
  },
  precio: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => !isNaN(value),
      message: "El precio debe ser un número",
    },
  },
  ventas: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venta",
    },
  ],
  imagen: {
    type: String,
  },
  fechaAgregado: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Producto", productoSchema);
