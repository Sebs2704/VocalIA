# 🗄️ VocalIA — MongoDB Atlas Setup

## Pasos para crear la base de datos (GRATIS)

### 1. Crear cuenta en MongoDB Atlas
1. Ve a https://www.mongodb.com/atlas
2. Crea cuenta gratuita (tier M0 — suficiente para empezar)
3. Crea un **nuevo proyecto** llamado `VocalIA`

### 2. Crear Cluster
1. Haz clic en **"Build a Database"**
2. Elige **M0 Free** (512 MB — gratis para siempre)
3. Proveedor: **AWS** / Región: la más cercana (ej. us-east-1)
4. Cluster name: `Cluster0`

### 3. Crear usuario de base de datos
1. Ve a **Security > Database Access**
2. Clic en **"Add New Database User"**
3. Método: Password
4. Usuario: `vocalia_admin`
5. Contraseña: genera una fuerte y guárdala
6. Rol: **Atlas admin** (para desarrollo; restringir en producción)

### 4. Permitir conexiones (Network Access)
1. Ve a **Security > Network Access**
2. Clic **"Add IP Address"**
3. Para desarrollo: **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Para producción: añade solo las IPs de tu servidor (Render/Railway)

### 5. Obtener la Connection String
1. Ve a tu Cluster > **"Connect"**
2. Elige **"Connect your application"**
3. Driver: **Python** / Version: 3.12+
4. Copia la cadena, que tendrá esta forma:
   ```
   mongodb+srv://vocalia_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Reemplaza `<password>` con tu contraseña real
6. Añade el nombre de la base al final: `...mongodb.net/vocalia?retryWrites...`

### 6. Inicializar las colecciones
En el Shell de Atlas (o con mongosh local):
```bash
mongosh "tu_connection_string" --file init.js
```

### 7. Configurar en el backend
Crea `/backend/.env` copiando `.env.example` y pegando tu URI:
```
MONGO_URI=mongodb+srv://vocalia_admin:tu_password@cluster0.xxxxx.mongodb.net/vocalia?retryWrites=true&w=majority
SECRET_KEY=genera_una_clave_con: python -c "import secrets; print(secrets.token_hex(32))"
```

## Estructura de colecciones

| Colección    | Propósito                                    |
|-------------|----------------------------------------------|
| `users`     | Cuentas registradas                          |
| `results`   | Resultados de análisis de voz (autenticados) |
| `dataset`   | Grabaciones anónimas para entrenar la IA     |
| `recordings`| Grabaciones personales del usuario           |

## Queries útiles para monitorear el dataset

```javascript
// Cuántas muestras hay por etiqueta
db.dataset.aggregate([
  { $group: { _id: "$label", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])

// Muestras sin etiquetar
db.dataset.find({ labeled: false }).count()

// Últimas 10 contribuciones
db.dataset.find().sort({ submitted_at: -1 }).limit(10)
```
