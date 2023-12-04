const express = require("express");
const Usuario = require("../models/usuariosM");
const sanitizeHtml = require("sanitize-html");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

const TOKEN_SECRET = "secretariat777";

const PrimerLetraMayus = (string) => {
  const palabras = string.trim().toLowerCase().split(" ");
  const palabrasMayusculas = palabras.map(
    (palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1)
  );
  return palabrasMayusculas.join(" ");
};

// Middleware para verificar el token
const auth = (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    jwt.verify(token, TOKEN_SECRET, (error, user) => {
      if (error) {
        return res.status(401).json({ message: "Token is not valid" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Crear un usuario
router.post("/crear", async (req, res) => {
  try {
    const { email, password, nombre, apellido } = req.body;

    const hash = await bcryptjs.hash(password, 10);

    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    // El usuario no existe, proceder con la creación
    const isAdmin =
      email === "admin@example.com" && password === "adminPassword";

    const usuario = new Usuario({
      email: sanitizeHtml(email.toLowerCase()).trim(),
      password: hash,
      nombre: sanitizeHtml(PrimerLetraMayus(nombre)).trim(),
      apellido: sanitizeHtml(PrimerLetraMayus(apellido)).trim(),
      isAdmin: isAdmin,
    });

    await usuario.validate();
    const result = await usuario.save();

    // Generar token
    const token = jwt.sign(
      { userId: result._id, isAdmin: result.isAdmin },
      TOKEN_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: "Error al generar el token" });
        } else {
          // Enviar el token al cliente
          res.cookie("token", token);
          // Devolver el mensaje correspondiente según el tipo de usuario creado
          if (isAdmin) {
            res.status(200).json({ message: "Bienvenido Admin", token });
          } else {
            res.status(200).json({ message: "Bienvenido Usuario", token });
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un usuario
router.post("/obtener", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await Usuario.findOne({ email });

    if (!userFound) {
      return res.status(400).json({
        message: ["El correo electrónico no existe"],
      });
    }

    const passwordMatch = await bcryptjs.compare(password, userFound.password);

    if (passwordMatch) {
      // Generar token
      const token = jwt.sign(
        { userId: userFound._id, isAdmin: userFound.isAdmin },
        TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      // Enviar el token al cliente
      res.cookie("token", token);

      // Devolver el mensaje correspondiente según el tipo de usuario creado
      if (userFound.isAdmin) {
        res
          .status(200)
          .json({ message: "Bienvenido Admin", isAdmin: true, token });
      } else {
        res
          .status(200)
          .json({ message: "Bienvenido Usuario", isAdmin: false, token });
      }
    } else {
      // Contraseña incorrecta
      res.status(401).json({ error: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error al obtener usuario", message: error.message });
  }
});

// En tu archivo de servidor (por ejemplo, usuariosRoutes.js)
router.get("/usuario-activo", async (req, res) => {
  try {
    // Obtener el token del encabezado de la solicitud
    const token = req.headers.authorization.split(" ")[1];

    // Verificar y descifrar el token
    const decodedToken = jwt.verify(token, TOKEN_SECRET);

    // Obtener el ID del usuario del token
    const userId = decodedToken.userId;

    // Buscar al usuario por ID
    const usuario = await Usuario.findById(userId);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Imprimir en la consola los datos del usuario activo
    console.log("Datos del usuario activo:", {
      nombre: usuario.nombre,
      email: usuario.email,
    });

    res.status(200).json({
      nombre: usuario.nombre,
      email: usuario.email,
      // Agrega otros datos del usuario que desees enviar al cliente
    });
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    res.status(500).json({ error: "Error al obtener el usuario activo" });
  }
});

// Actualizar un usuario por su correo electrónico
router.put("/actualizar/:email", async (req, res) => {
  try {
    const datosUsuario = req.body;
    const email = req.params.email.trim().toLowerCase();

    // Validar si hay campos vacíos
    const camposRequeridos = ["nombre", "apellido", "password"];
    for (const campo of camposRequeridos) {
      if (!datosUsuario[campo]) {
        return res
          .status(400)
          .json({ error: `El campo ${campo} no puede estar vacío` });
      }
    }

    // Sanitizar y formatear campos
    const sanitizedDatos = {
      nombre: PrimerLetraMayus(sanitizeHtml(datosUsuario.nombre)),
      apellido: PrimerLetraMayus(sanitizeHtml(datosUsuario.apellido)),
      password: datosUsuario.password.trim(),
    };

    // Actualizar el usuario
    const result = await Usuario.findOneAndUpdate(
      { email: email },
      sanitizedDatos,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un usuario por su correo electrónico
router.delete("/borrar/:email", async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    try {
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const result = await Usuario.findOneAndDelete({ email });
    if (!result) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado con éxito" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Correo electrónico no válido" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

module.exports = router;
