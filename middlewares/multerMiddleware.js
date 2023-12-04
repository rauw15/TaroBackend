const multer = require("multer");
const path = require("path");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const multerMiddleware = (req, res, next) => {
  upload.single("imagen")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error(err);
      res.status(500).json({ error: "Error al cargar la imagen" });
    } else if (err) {
      console.error(err);
      res.status(500).json({ error: "Error en el servidor" });
    } else {
      next();
    }
  });
};

module.exports = multerMiddleware;
