-- 03_seed_catalogos.sql
-- Datos base: géneros, actores, películas, relación película-actor y usuarios.
-- Ejecutar UNA sola vez (si se repite, fallará por los UNIQUE o duplicará datos).

USE CineStream;
GO

-- GÉNEROS
INSERT INTO generos (nombre) VALUES
(N'Acción'), (N'Comedia'), (N'Drama'), (N'Terror'),
(N'Ciencia ficción'), (N'Animación'), (N'Romance'), (N'Documental');

-- ACTORES
INSERT INTO actores (nombre, nacionalidad, fecha_nacimiento) VALUES
(N'Keanu Reeves',      N'Canadá',         '1964-09-02'),
(N'Scarlett Johansson',N'Estados Unidos', '1984-11-22'),
(N'Tom Hanks',         N'Estados Unidos', '1956-07-09'),
(N'Penélope Cruz',     N'España',         '1974-04-28'),
(N'Gael García Bernal',N'México',         '1978-11-30'),
(N'Emma Stone',        N'Estados Unidos', '1988-11-06'),
(N'Denzel Washington', N'Estados Unidos', '1954-12-28'),
(N'Natalie Portman',   N'Israel',         '1981-06-09'),
(N'Ryan Gosling',      N'Canadá',         '1980-11-12'),
(N'Viola Davis',       N'Estados Unidos', '1965-08-11');

-- PELÍCULAS
INSERT INTO peliculas (titulo, anio, duracion_min, id_genero, precio_alquiler) VALUES
(N'Operación Relámpago',   2019, 120, 1, 3.99),
(N'Risas en la Ciudad',    2021,  95, 2, 2.99),
(N'El Último Invierno',    2018, 140, 3, 3.49),
(N'La Casa del Espejo',    2022, 105, 4, 3.99),
(N'Galaxia Perdida',       2023, 150, 5, 4.49),
(N'Aventuras del Bosque',  2020,  88, 6, 2.49),
(N'Un Verano en París',    2017, 110, 7, 2.99),
(N'Planeta Vivo',          2021,  95, 8, 2.49),
(N'Código Rojo',           2024, 125, 1, 4.49),
(N'La Gran Confusión',     2016,  98, 2, 1.99),
(N'Sombras del Pasado',    2015, 132, 3, 2.49),
(N'Noche de Luna Llena',   2020, 101, 4, 3.49),
(N'Horizonte Cero',        2022, 138, 5, 3.99),
(N'El Pequeño Dragón',     2019,  92, 6, 2.99),
(N'Cartas de Amor',        2018, 107, 7, 2.99);

-- PELÍCULAS_ACTORES
INSERT INTO peliculas_actores (id_pelicula, id_actor) VALUES
(1,1),(1,7),(2,6),(2,9),(3,3),(3,10),(4,4),(4,8),
(5,2),(5,1),(6,5),(7,4),(7,9),(8,3),(9,7),(9,1),
(10,6),(11,10),(11,3),(12,8),(13,2),(13,9),(14,5),(15,6),(15,4);

-- USUARIOS
INSERT INTO usuarios (nombre, email, fecha_registro) VALUES
(N'Ana Rodríguez',   'ana.rodriguez@mail.com',   '2024-01-15'),
(N'Luis Mora',       'luis.mora@mail.com',       '2024-02-03'),
(N'Sofía Vargas',    'sofia.vargas@mail.com',    '2024-02-20'),
(N'Carlos Jiménez',  'carlos.jimenez@mail.com',  '2024-03-11'),
(N'María Solano',    'maria.solano@mail.com',    '2024-04-05'),
(N'Diego Chaves',    'diego.chaves@mail.com',    '2024-05-18'),
(N'Valeria Núñez',   'valeria.nunez@mail.com',   '2024-06-09'),
(N'Andrés Quesada',  'andres.quesada@mail.com',  '2024-07-22'),
(N'Camila Rojas',    'camila.rojas@mail.com',    '2024-08-14'),
(N'Jorge Araya',     'jorge.araya@mail.com',     '2024-09-30');
GO

-- Verificación (esperado: 8, 10, 15, 25, 10)
SELECT
  (SELECT COUNT(*) FROM generos)           AS generos,
  (SELECT COUNT(*) FROM actores)           AS actores,
  (SELECT COUNT(*) FROM peliculas)         AS peliculas,
  (SELECT COUNT(*) FROM peliculas_actores) AS peliculas_actores,
  (SELECT COUNT(*) FROM usuarios)          AS usuarios;
GO