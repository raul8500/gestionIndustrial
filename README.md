# Sistema de Gestión de Oficios

Este sistema permite la gestión de oficios, que incluye la creación, actualización, eliminación y visualización de oficios registrados. Además, permite la carga y eliminación de archivos asociados a cada oficio.

## Funcionalidades

- **Registrar un nuevo oficio**: Permite crear un nuevo oficio con información como número de oficio, fecha, tipo de correspondencia, institución, asunto, tipo de respuesta, departamento turnado, observaciones, y tiempo de respuesta. Además, se pueden adjuntar archivos a cada oficio.
  
- **Actualizar un oficio**: Permite modificar los detalles de un oficio existente, incluyendo los archivos adjuntos. Si es necesario, los archivos existentes pueden eliminarse y agregar nuevos archivos.

- **Eliminar un oficio**: Elimina un oficio y sus archivos asociados de la base de datos y del sistema de archivos.

- **Ver todos los oficios**: Muestra una lista de todos los oficios registrados con la posibilidad de ver los archivos adjuntos y realizar acciones de editar o eliminar.

## Tecnologías utilizadas

- **Backend**: 
  - Node.js
  - Express
  - MongoDB (para almacenar los oficios)
  - Multer (para manejar la carga de archivos)

- **Frontend**:
  - DataTables (para mostrar los oficios en una tabla con funcionalidades de búsqueda, ordenación y paginación)
  - Bootstrap (para los estilos de la interfaz de usuario)

## Instrucciones de instalación

### Requisitos previos

Asegúrate de tener los siguientes programas instalados:

- [Node.js](https://nodejs.org/) (v14 o superior)
- [MongoDB](https://www.mongodb.com/) (puedes usar MongoDB Atlas o instalarlo localmente)

### Pasos para la instalación

1. Clona este repositorio:

    ```bash
    git clone https://github.com/tu-usuario/gestion-oficios.git
    cd gestion-oficios
    ```

2. Instala las dependencias:

    ```bash
    npm install
    ```

3. Crea un archivo `.env` en la raíz del proyecto y configura las variables de entorno necesarias. Un ejemplo de `.env` podría ser:

    ```
    MONGO_URI=mongodb://localhost:27017/gestion_oficios
    ```

    Asegúrate de cambiar `MONGO_URI` por tu propia URL de conexión a MongoDB.

4. Inicia el servidor:

    ```bash
    npm start
    ```

    El servidor debería estar corriendo en `http://localhost:3000`.

## Uso

1. **Subir un oficio**: Puedes registrar un nuevo oficio completando el formulario en la interfaz web. Este formulario permite adjuntar archivos junto con los detalles del oficio.

2. **Actualizar un oficio**: Para editar un oficio, haz clic en el botón de editar en la tabla de oficios, realiza las modificaciones necesarias y guarda los cambios. Puedes eliminar archivos existentes y agregar nuevos.

3. **Eliminar un oficio**: Haz clic en el botón de eliminar en la tabla de oficios para eliminar un oficio y sus archivos asociados.

## Estructura de Archivos

- **/public/archivos/**: Carpeta donde se almacenan los archivos subidos.
- **/schemas/oficiosSchema/**: Contiene el esquema de MongoDB para los oficios.
- **/controllers/**: Contiene los controladores para manejar la lógica de los oficios (crear, actualizar, eliminar, etc.).
- **/routes/**: Define las rutas del sistema para manejar las solicitudes de la API.

## API Endpoints

- `GET /api/getOficios`: Obtiene todos los oficios.
- `GET /api/getOficio/:id`: Obtiene un oficio específico por ID.
- `POST /api/createOficio`: Crea un nuevo oficio.
- `PUT /api/updateOficio/:id`: Actualiza un oficio existente.
- `DELETE /api/deleteOficio/:id`: Elimina un oficio.

## Contribuciones

Si deseas contribuir a este proyecto, por favor haz un fork de este repositorio y envía tus pull requests. Asegúrate de que tu código esté bien documentado y probado.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
