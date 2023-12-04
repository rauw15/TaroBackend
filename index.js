require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const usuariosRoutes = require("./routes/usuariosC");
const productosRoutes = require("./routes/productosC");
const ventasRoutes = require("./routes/ventasC");
const app = express();
const port = process.env.PORT || 3001;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const http = require("http");

const mongoURI = "mongodb+srv://Taro:12345@cluster0.ha8qnnw.mongodb.net/TaroDB";

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Conexión a la base de datos establecida con éxito");

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Usuario conectado");

      socket.on("message", (body) => {
        socket.broadcast.emit("message", {
          body,
          from: socket.id.slice(8),
        });
      });
    });

    server.listen(port, () => {
      console.log(`Servidor en ejecución en el puerto ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error al conectar a la base de datos:", error);
  });

app.use(bodyParser.json());
app.use(cors());

app.use("/usuarios", usuariosRoutes);
app.use("/productos", productosRoutes);
app.use("/ventas", ventasRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor" });
});
