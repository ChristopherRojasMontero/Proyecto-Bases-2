# Bitácora de seguimiento del proyecto CineAdmin

**Curso:** EIF402\
**Proyecto:** CineAdmin\
**Base de datos:** CineStream\
**Periodo documentado:** 13 de agosto al 3 de noviembre de 2026\
**Repositorio:** Repositorio grupal de GitHub

------------------------------------------------------------------------

## 1. Propósito de la bitácora

La presente bitácora tiene como finalidad registrar el avance del
proyecto CineAdmin durante su desarrollo, tomando como referencia el
historial de commits y las integraciones realizadas en el repositorio
grupal de GitHub.

Se documentan las principales actividades relacionadas con la
configuración inicial, creación de la base de datos, desarrollo de los
módulos, elaboración de documentación técnica y la integración de los
aportes de los integrantes.


## 2. Integrantes y participación registrada

En el historial compartido aparecen las siguientes cuentas de GitHub:

  -----------------------------------------------------------------------
  Usuario de GitHub                   Participación identificada en el
                                      historial
  ----------------------------------- -----------------------------------
  `ChristopherRojasMontero`           Creación inicial del repositorio y
                                      participación en la integración de
                                      cambios mediante Pull Requests.
                                      También registra commits
                                      relacionados con el Módulo 5.

  `margo-gomo`                        Configuración de la base de datos y
                                      del backend, desarrollo del Módulo
                                      1, documentación técnica e
                                      integración de vistas.

  `Danyjosu69`                        Desarrollo del Módulo 3 y
                                      posteriormente del Módulo 6, además
                                      de mejoras y ajustes relacionados
                                      con la portabilidad del proyecto.

  `mariacastroh-799`                  Desarrollo de elementos del Módulo
                                      4 relacionados con respaldos,
                                      incluyendo archivos del backend y
                                      scripts SQL.

  `Luis-Brenes-F`                     Desarrollo del Módulo 2 y
                                      elaboración de su documentación y
                                      evidencias de pruebas.
  -----------------------------------------------------------------------

## 3. Registro cronológico de actividades

### 13 de agosto de 2026 -- Creación del repositorio

-   Se registra el commit inicial del repositorio, realizado por
    `ChristopherRojasMontero`.
-   Este commit constituye el punto de partida del control de versiones
    del proyecto.

### 23 de septiembre de 2026 -- Configuración inicial y primeros módulos

-   `margo-gomo` incorpora los scripts de creación y carga inicial de
    datos de la base de datos CineStream.
-   Se agrega la configuración del usuario `cine_app`, una guía de
    configuración y el archivo `.gitignore` para el proyecto Node.js.
-   Se incorpora la conexión del backend con SQL Server y una prueba de
    conexión.
-   `Danyjosu69` agrega el Módulo 3, relacionado con las rutas de
    almacenamiento: filegroups, tamaño, objetos grandes y crecimiento.
-   Se registra la integración de cambios mediante un Pull Request
    asociado al desarrollo del proyecto.

### 2 de octubre de 2026 -- Integración de módulos

-   Se registra la integración del Módulo 3 mediante el Pull Request #3.
-   Se registra la integración del Módulo 1 mediante el Pull Request #1.
-   Estas integraciones incorporan al repositorio principal los avances
    que habían sido desarrollados en sus respectivas ramas.

### 5 de octubre de 2026 -- Desarrollo y documentación del Módulo 1

-   `margo-gomo` agrega el Módulo 1, correspondiente al estado general
    de la instancia.
-   Se registra la sincronización de la rama de trabajo con `develop`.
-   Se incorpora el contrato de API del Módulo 1.
-   Se integra el Pull Request #4, relacionado con las vistas del Módulo
    1.

### 19 de octubre de 2026 -- Desarrollo del Módulo 5

-   `ChristopherRojasMontero` registra dos versiones de trabajo
    relacionadas con el Módulo 5 (V1 y V2).
-   Estos cambios reflejan avances en la implementación del módulo.

### 26 de octubre de 2026 -- Incorporación del Módulo 6 y mejoras generales

-   `Danyjosu69` agrega el Módulo 6.
-   Se realizan mejoras al Módulo 3.
-   Se incorporan ajustes de configuración y portabilidad del proyecto.
-   Se registra un Pull Request para integrar estos cambios en la rama
    principal correspondiente.

### 28 de octubre de 2026 -- Avances del Módulo 4

-   `mariacastroh-799` registra cambios relacionados con los respaldos
    en el backend y la base de datos.
-   Se incorpora una modificación en el archivo `server.js`, relacionada
    con la integración del módulo en el servidor.

### 29 de octubre de 2026 -- Desarrollo del Módulo 4 y del Módulo 2

-   `mariacastroh-799` incorpora el archivo `respaldos.js`,
    correspondiente a las rutas del backend del Módulo 4.
-   También se agrega el script `respaldos.sql`.
-   `Luis-Brenes-F` agrega el Módulo 2, correspondiente al monitoreo del
    rendimiento.
-   Se incorpora el contrato de API del Módulo 2.
-   Se agregan evidencias de pruebas del Módulo 2.
-   `margo-gomo` registra cambios para integrar seis vistas y el
    monitoreo de memoria del Módulo 1.

### 30 de octubre de 2026 -- Integración de los módulos

-   Se registran los Pull Requests #6, #7, #8, #9 y #10,
    correspondientes a la integración de avances de los módulos
    desarrollados por el equipo.
-   Entre estas integraciones se encuentra el Pull Request #8,
    relacionado con el Módulo 4.
-   También se registra la integración de cambios entre las ramas `main`
    y `develop`, así como el Pull Request #11.
-   Con estos cambios, el repositorio refleja la integración de los
    avances de los seis módulos del proyecto.
-   `ChristopherRojasMontero` actualiza el `.gitignore` para excluir la
    carpeta `.idea/` del editor y ajusta `server.js` ("Arreglo 1").
-   Se agrega el manual de usuario de CineAdmin
    (`docs/manual_usuario.docx`) mediante el Pull Request #12.

### 2 de noviembre de 2026 -- Correcciones, evidencias e integración final

-   Se corrige el inicio de la API integrada (Pull Request #13): tras los
    merges, `server.js` tenía declarados dos veces `PORT` y `app.listen`,
    y algunas rutas se registraban después de iniciar el servidor. Se
    dejan registradas las rutas de los seis módulos antes del
    middleware de errores.
-   `Luis-Brenes-F` agrega las evidencias de pruebas de los Módulos 1 a
    6 (Pull Request #14): 43 llamadas a la API real contra CineStream,
    con pruebas negativas y observaciones. Reemplazan al documento de
    evidencias que solo cubría el Módulo 2 y quedan en la carpeta
    `docs/`.
-   `mariacastroh-799` agrega esta bitácora de seguimiento al
    repositorio.
-   `Danyjosu69` corrige el cálculo del promedio diario de crecimiento
    del Módulo 3: con mediciones separadas por segundos se proyectaba un
    valor irreal (304 MB/día). Ahora solo se calcula con al menos 24
    horas de mediciones y se agrega el campo `periodo_horas`. También se
    incorpora el script `09_verificar_crecimiento.sql` para revisar y
    registrar mediciones reales (Pull Request #15).
-   `ChristopherRojasMontero` integra la reparación de errores detectados
    en una auditoría del código (Pull Request #16): los errores internos
    ya no se muestran en las respuestas de la API, la detección de
    objetos inválidos del Módulo 6 pasa a ser de solo lectura, la
    recompilación rechaza objetos firmados, se interpretan las fechas
    con la zona horaria de Costa Rica y se agregan pruebas automatizadas
    del backend y del frontend. Se retira `.idea/workspace.xml` del
    repositorio.
-   Se integra `develop` en `main` para la entrega (Pull Request #17).

### 3 de noviembre de 2026 -- Pruebas finales con datos reales

-   Se recrea la base de datos desde cero con los scripts 01 a 09 en una
    instancia de SQL Server, sin errores.
-   Se prueban las 30 rutas de consulta de la API contra la instancia
    real: todas responden correctamente (HTTP 200).
-   Se revisan las seis vistas del frontend con información real:
    estado de la instancia, rendimiento, almacenamiento, respaldos,
    auditoría y mantenimiento.
-   Módulo 3: se registran tres mediciones reales del almacenamiento,
    con actividad real entre ellas (100.000 alquileres nuevos), que
    muestran el crecimiento de la base de datos.
-   Módulo 4: se realiza un respaldo completo real de CineStream, que
    aparece en el historial de `msdb` y en la aplicación.
-   Módulo 6: se prueba el ciclo completo de mantenimiento: actualización
    de estadísticas, detección de dos objetos inválidos, recompilación
    con resultado ERROR, corrección de la causa y recompilación con
    resultado OK, todo registrado en la bitácora de mantenimiento.
-   Las pruebas automatizadas pasan: 8 del backend y 3 del frontend.

## 4. Problemas encontrados y soluciones

  -----------------------------------------------------------------------
  Problema                            Solución
  ----------------------------------- -----------------------------------
  La API integrada no iniciaba por    Se reorganizó `server.js` con un
  declaraciones duplicadas de `PORT`  único `app.listen` y todas las
  y `app.listen` en `server.js`.      rutas registradas antes del
                                      middleware de errores (PR #13).

  El promedio diario de crecimiento   Solo se calcula con al menos 24
  mostraba valores irreales con       horas de mediciones; se agregó
  mediciones muy cercanas en el       `periodo_horas` y el script 09
  tiempo.                             (PR #15).

  SQL Server Express no tiene SQL     La API registra mediciones de
  Server Agent para programar         almacenamiento automáticamente
  tareas.                             mientras está encendida, y el
                                      mantenimiento se ejecuta desde la
                                      aplicación.

  Las respuestas de error podían      Los detalles quedan solo en el
  exponer detalles internos.          registro local de la API; el
                                      usuario recibe mensajes claros
                                      (PR #16).

  Archivos del editor (`.idea/`)      Se agregó la carpeta al
  incluidos en el repositorio.        `.gitignore` y se retiraron del
                                      repositorio.
  -----------------------------------------------------------------------

## 5. Estado del proyecto según el historial revisado

Al 3 de noviembre de 2026, los seis módulos están integrados en la rama
`main` y fueron probados contra una instancia real de SQL Server. El
repositorio contiene el código del backend y del frontend, los scripts
de la base de datos, los contratos de API, las evidencias de pruebas, el
manual de usuario y esta bitácora.

Pendientes para cerrar la entrega: subir la presentación final,
completar los contratos de API de los Módulos 4 y 5 y crear la etiqueta
`v1.0-entrega-final` sobre la versión final de `main`.


