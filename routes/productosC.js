const express = require("express");
const Producto = require("../models/productosM");
const Usuario = require("../models/usuariosM");
const sanitizeHtml = require("sanitize-html");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const router = express.Router();

// Configurar Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: "dtayrgscb",
  api_key: "334341624515751",
  api_secret: "m3CncmM9O83Zat7LGwDZhE7VO64",
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PrimerLetraMayus = (string) => {
  const palabras = string.trim().toLowerCase().split(" ");
  const palabrasMayusculas = palabras.map(
    (palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1)
  );
  return palabrasMayusculas.join(" ");
};

// Agregar un nuevo producto
router.post("/crear", upload.single("imagen"), async (req, res) => {
  try {
    const { nombreProducto, talla, marca, categoria, cantidad, precio } =
      req.body;
    const imagenBuffer = req.file.buffer;

    const result = await cloudinary.uploader
      .upload_stream({ resource_type: "image" }, async (error, result) => {
        if (error) {
          console.error(error);
          res.status(500).json({ error: error.message });
        } else {
          const producto = new Producto({
            nombreProducto: sanitizeHtml(
              PrimerLetraMayus(nombreProducto)
            ).trim(),
            talla: sanitizeHtml(PrimerLetraMayus(talla)).trim(),
            marca: sanitizeHtml(PrimerLetraMayus(marca)).trim(),
            categoria: sanitizeHtml(PrimerLetraMayus(categoria)).trim(),
            cantidad: sanitizeHtml(cantidad).trim(),
            precio: sanitizeHtml(precio).trim(),
            imagen: result.secure_url,
          });

          await producto.validate();
          const resultadoProducto = await producto.save();

          res.json({
            message: "Producto agregado con éxito",
            imageUrl: result.secure_url,
            producto: resultadoProducto,
          });
        }
      })
      .end(imagenBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/actualizar/:id", async (req, res) => {
  try {
    const productId = req.params.id; // Obtener el ID del producto
    const productoActualizado = req.body;

    // Validar si hay campos vacíos
    const camposRequeridos = [
      "nombreProducto",
      "talla",
      "marca",
      "categoria",
      "cantidad",
      "precio",
    ];
    for (const campo of camposRequeridos) {
      if (!productoActualizado[campo]) {
        return res
          .status(400)
          .json({ error: `El campo ${campo} no puede estar vacío` });
      }
    }

    // Validar si la talla es válida
    const tallasPermitidas = [
      "Chica",
      "Mediana",
      "Grande",
      "Extragrande",
      "chica",
      "mediana",
      "grande",
      "extragrande",
    ];
    if (
      productoActualizado.talla &&
      !tallasPermitidas.includes(productoActualizado.talla)
    ) {
      return res
        .status(400)
        .json({ error: "La talla proporcionada no es válida" });
    }

    // Validar si la categoria es válida
    const categoriasPermitidas = ["Hombre", "hombre", "Mujer", "mujer"];
    if (
      productoActualizado.categoria &&
      !categoriasPermitidas.includes(productoActualizado.categoria)
    ) {
      return res
        .status(400)
        .json({ error: "La categoria proporcionada no es válida" });
    }

    // Sanitizar y formatear campos
    productoActualizado.nombreProducto = PrimerLetraMayus(
      sanitizeHtml(productoActualizado.nombreProducto)
    );
    productoActualizado.categoria = PrimerLetraMayus(
      sanitizeHtml(productoActualizado.categoria)
    );
    productoActualizado.talla = PrimerLetraMayus(
      sanitizeHtml(productoActualizado.talla)
    );
    productoActualizado.marca = PrimerLetraMayus(
      sanitizeHtml(productoActualizado.marca)
    );

    // Validar si el nuevo nombre de producto ya está en uso
    const productoExistente = await Producto.findOne({
      nombreProducto: productoActualizado.nombreProducto,
    });
    if (productoExistente && productoExistente._id.toString() !== productId) {
      return res
        .status(400)
        .json({ error: "El nuevo nombre de producto ya está en uso" });
    }

    // Actualizar el producto
    const result = await Producto.findByIdAndUpdate(
      productId,
      { $set: productoActualizado },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un producto por su nombre
router.get("/obtener/:nombreProducto", async (req, res) => {
  try {
    const nombreProductoFormateado = PrimerLetraMayus(
      req.params.nombreProducto.trim()
    );

    const producto = await Producto.findOne({
      nombreProducto: nombreProductoFormateado,
    });
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error al obtener los productos:', error);
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
  
});

// Obtener todos los productos
router.get("/obtenerProductos", async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener todos los productos" });
  }
});

// Obtener todos los productos por categoría
router.get("/obtenerCategoria/:categoria", async (req, res) => {
  try {
    const categoria = PrimerLetraMayus(
      sanitizeHtml(req.params.categoria.trim())
    );

    const productos = await Producto.find({ categoria });
    const productosFormateados = productos.map((producto) => {
      return {
        // Mantén todos los campos del producto
        id: producto._id, // Añade el ID para identificar de manera única cada producto
        nombre: PrimerLetraMayus(sanitizeHtml(producto.nombreProducto)).trim(),
        talla: PrimerLetraMayus(sanitizeHtml(producto.talla)).trim(),
        marca: PrimerLetraMayus(sanitizeHtml(producto.marca)).trim(),
        categoria: PrimerLetraMayus(sanitizeHtml(producto.categoria)).trim(),
        cantidad: producto.cantidad,
        precio: producto.precio,
        imagen: producto.imagen,
      };
    });

    res.json(productosFormateados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un producto por su ID
router.delete("/borrar/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await Producto.findByIdAndDelete(productId);
    if (!result) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

router.put("/inventario/:productId", async (req, res) => {
  const productId = req.params.productId;
  const updateQuantity = req.body.cantidad;

  try {
    const product = await Producto.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Actualiza la cantidad
    product.cantidad += updateQuantity;

    // Si la cantidad es 0 o menor, elimina el producto
    if (product.cantidad <= 0) {
      await Producto.findByIdAndDelete(productId);
      return res.json({ message: "Producto eliminado del inventario" });
    }

    // Guarda los cambios en la base de datos
    await product.save();

    res.json({ message: "Cantidad del producto actualizada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/obtenerNuevosLanzamientos", async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Establece la hora a las 00:00:00:000 UTC

    const productos = await Producto.find({
      fechaAgregado: { $gte: today },
    })
      .sort({ fechaAgregado: -1 }) // Ordena de manera descendente por fecha de agregado
      .exec();

    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener nuevos lanzamientos" });
  }
});

// Obtener productos editados por precio
router.get("/obtenerProductosEditados/:precio", async (req, res) => {
  try {
    const precioEditado = parseFloat(sanitizeHtml(req.params.precio.trim()));

    // Buscar productos editados en función del precio
    const productosEditados = await Producto.find({
      precio: { $lte: precioEditado },
    });

    // Puedes formatear los productos según tus necesidades
    const productosFormateados = productosEditados.map((producto) => {
      return {
        id: producto._id,
        nombreProducto: PrimerLetraMayus(
          sanitizeHtml(producto.nombreProducto)
        ).trim(),
        imagen: producto.imagen,
        descripcion: `Talla: ${producto.talla}, Marca: ${producto.marca}, Cantidad: ${producto.cantidad}`,
        precio: producto.precio,
      };
    });

    res.json(productosFormateados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
