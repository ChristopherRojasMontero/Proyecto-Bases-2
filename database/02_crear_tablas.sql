-- 02_crear_tablas.sql
-- Crea las 7 tablas de CineStream.

USE CineStream;
GO

CREATE TABLE generos (
    id_genero   INT IDENTITY(1,1) PRIMARY KEY,
    nombre      NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE actores (
    id_actor         INT IDENTITY(1,1) PRIMARY KEY,
    nombre           NVARCHAR(100) NOT NULL,
    nacionalidad     NVARCHAR(50) NULL,
    fecha_nacimiento DATE NULL
);

CREATE TABLE peliculas (
    id_pelicula     INT IDENTITY(1,1) PRIMARY KEY,
    titulo          NVARCHAR(150) NOT NULL,
    anio            INT NOT NULL,
    duracion_min    INT NULL,
    id_genero       INT NOT NULL,
    precio_alquiler DECIMAL(6,2) NOT NULL DEFAULT 2.99,
    CONSTRAINT FK_peliculas_generos
        FOREIGN KEY (id_genero) REFERENCES generos(id_genero)
);

CREATE TABLE peliculas_actores (
    id_pelicula INT NOT NULL,
    id_actor    INT NOT NULL,
    PRIMARY KEY (id_pelicula, id_actor),
    FOREIGN KEY (id_pelicula) REFERENCES peliculas(id_pelicula),
    FOREIGN KEY (id_actor)    REFERENCES actores(id_actor)
);

CREATE TABLE usuarios (
    id_usuario      INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(100) NOT NULL,
    email           NVARCHAR(120) NOT NULL UNIQUE,
    fecha_registro  DATE NOT NULL DEFAULT GETDATE()
);

CREATE TABLE alquileres (
    id_alquiler     INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario      INT NOT NULL,
    id_pelicula     INT NOT NULL,
    fecha_alquiler  DATETIME NOT NULL DEFAULT GETDATE(),
    monto           DECIMAL(6,2) NOT NULL,
    FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_pelicula) REFERENCES peliculas(id_pelicula)
);

CREATE TABLE resenas (
    id_resena       INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario      INT NOT NULL,
    id_pelicula     INT NOT NULL,
    calificacion    INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario      NVARCHAR(500) NULL,
    fecha           DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_pelicula) REFERENCES peliculas(id_pelicula)
);
GO