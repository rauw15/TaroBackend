const express = require("express");
const Venta = require("../models/ventasM");
const Usuario = require("../models/usuariosM");
const Producto = require("../models/productosM");
const router = express.Router();

router.post("/crear", async (req, res) => {
  try {
    const { userEmail, detallesVenta } = req.body;

    const usuario = await Usuario.findOne({ email: userEmail });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    let total = 0; // Inicializar el total

    const ventasPromises = detallesVenta.map(async (detalle) => {
      const producto = await Producto.findOne({
        nombreProducto: detalle.nombreProducto.trim(),
      });

      if (!producto) {
        return res.status(404).json({
          message: "Producto no encontrado: " + detalle.nombreProducto,
        });
      }

      const venta = new Venta({
        Usuario: usuario._id,
        Producto: producto._id,
        cantidad: detalle.cantidad,
        totalProducto: detalle.cantidad * producto.precio, // Nuevo campo para el total del producto
      });

      total += venta.totalProducto; // Actualizar el total

      const result = await venta.save();

      // Agregar el _id de la venta al array 'compras' del usuario
      usuario.compras.push(result._id);
      producto.ventas.push(result._id);

      await usuario.save();
      await producto.save();

      return result;
    });

    const ventas = await Promise.all(ventasPromises);

    // Agregar el total al objeto de respuesta
    res.json({ ventas, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/obtenertodas", async (req, res) => {
  try {
    const ventas = await Venta.find()
      .populate("Usuario", "nombre apellido email")
      .populate(
        "Producto",
        "nombreProducto nombre talla marca cantidad imagen precio"
      );

    // Enviar todos los detalles relacionados con la venta al frontend
    const ventasDetalladas = ventas.map((venta) => {
      return {
        _id: venta._id,
        Usuario: venta.Usuario,
        Productos: Array.isArray(venta.Producto)
          ? venta.Producto.map((product) => ({
              nombreProducto:
                product.nombreProducto || "Producto no disponible",
              precio: product.precio || 0,
              cantidad: product.cantidad || 1,
              totalProducto: product.totalProducto || 0, // Nuevo campo para el total del producto
            }))
          : [
              {
                nombreProducto: venta.Producto
                  ? venta.Producto.nombreProducto || "Producto no disponible"
                  : "Producto no disponible",
                precio: venta.Producto ? venta.Producto.precio || 0 : 0,
                cantidad: venta.Producto ? venta.Producto.cantidad || 1 : 1,
                totalProducto: venta.Producto
                  ? venta.Producto.totalProducto || 0
                  : 0, // Nuevo campo para el total del producto
              },
            ],
        total: venta.total,
      };
    });

    res.json({ ventas: ventasDetalladas });
  } catch (error) {
    console.error("Error al obtener todas las ventas:", error);
    res.status(500).json({ error: "Error al obtener todas las ventas" });
  }
});

// Eliminar una venta por ID
router.delete("/borrar/:ventaId", async (req, res) => {
  try {
    const result = await Venta.findByIdAndDelete(req.params.ventaId);

    if (!result) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Eliminar la referencia en el array 'compras' del usuario
    const usuario = await Usuario.findById(result.Usuario);
    usuario.compras.splice(usuario.compras.indexOf(result._id), 1);
    await usuario.save();

    // Eliminar la referencia en el array 'ventas' del producto
    const producto = await Producto.findById(result.Producto);
    producto.ventas.splice(producto.ventas.indexOf(result._id), 1);
    await producto.save();

    res.json({ message: "Venta eliminada con éxito" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la venta" });
  }
});

module.exports = router;