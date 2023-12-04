const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const usuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    type: String,
    required: true,
    match: /^[^\s][^\s]*$/,
  },
  nombre: {
    type: String,
    required: true,
    match: /^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]+(\s[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]+)?$/,
  },
  apellido: {
    type: String,
    required: true,
    match: /^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]+(\s[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]+)?$/,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  compras: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venta",
    },
  ],
});

module.exports = mongoose.model("Usuario", usuarioSchema);
