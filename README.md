# Challenge IO - Sistema de Emisión de Tarjetas

Una aplicación moderna para solicitar y procesar tarjetas de crédito y débito de forma automática y segura.

## 💡 ¿Qué hace esta aplicación?

Este sistema permite a los clientes solicitar tarjetas de crédito o débito. Una vez recibida la solicitud, el sistema la procesa de manera inteligente: si algo falla, reintenta automáticamente hasta 3 veces antes de dar la solicitud por perdida. Al finalizar exitosamente, se genera una tarjeta nueva con su número, fecha de expiración y código de seguridad.

## 🏗️ Cómo funciona

La aplicación tiene dos partes trabajando juntas:

### 1. **API de Emisión** 
Recibe las solicitudes de tarjetas desde internet y las pone en cola para procesarlas.

### 2. **Procesador de Tarjetas**
Toma las solicitudes de la cola, las valida, y crea las tarjetas. Si encuentra problemas, reintenta varias veces antes de rendirse.

## 🚀 Tecnologías Utilizadas

- **NestJS** - Framework web moderno para Node.js
- **TypeScript** - JavaScript con tipos para mayor seguridad
- **Kafka** - Sistema de mensajería para procesar solicitudes de forma ordenada
- **PostgreSQL** - Base de datos para guardar toda la información
- **Docker** - Para ejecutar todo de forma sencilla

## 📋 Características Principales

### Sistema de Reintentos con Kafka
- ✅ Política de reintentos configurable (3 intentos por defecto)
- ✅ Delays exponenciales: 1s, 2s, 4s
- ✅ Dead Letter Queue (DLQ) para mensajes fallidos
- ✅ Fire-and-forget pattern con `emit()`

### Gestión de Clientes y Tarjetas
- ✅ Creación/actualización de clientes
- ✅ Validación de tarjetas duplicadas (cliente + tipo)
- ✅ Generación automática de tarjetas (número, CVV, fecha exp.)
- ✅ Límite de crédito configurable
- ✅ Estados de tarjeta: active, blocked, expired

### Tracking y Auditoría
- ✅ Registro completo de tracking por solicitud
- ✅ Estados: pending, processing, retry, success, sent_to_dlq, card_created
- ✅ Historial de reintentos por cliente
- ✅ Trazabilidad por topic de Kafka

### Topics de Kafka
- `io.card.requested.v1` - Solicitudes de tarjetas
- `io.card.requested.v1.dlq` - Cola de errores
- `io.card.processed.v1` - Tarjetas procesadas exitosamente

### Consumer Groups
- `card-processor-group` - Consume de todos los topics

## 🗄️ Modelo de Datos

### Tablas
1. **card_requests** - Datos del cliente (único por documento)
2. **card_request_tracking** - Historial de eventos y reintentos
3. **cards** - Tarjetas emitidas (una activa por cliente/tipo)

## 🐳 Instalación y Ejecución

### Requisitos Previos
- Docker y Docker Compose
- Node.js 20+ (solo para desarrollo local)

### Opción 1: Con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <repository-url>
cd challenge-io

# Levantar todos los servicios
docker-compose up --build -d

# Ver logs
docker-compose logs -f issuer-api
docker-compose logs -f card-processor

# Detener servicios
docker-compose down

# Limpiar volúmenes (base de datos)
docker-compose down -v
```

**Servicios disponibles:**
- Issuer API: http://localhost:3001
- PostgreSQL: localhost:5432
- Kafka: localhost:9092

### Opción 2: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Levantar solo infraestructura (Postgres, Kafka, Zookeeper)
docker-compose up postgres kafka zookeeper kafka-init -d

# Ejecutar aplicaciones en modo desarrollo
npm run start:dev issuer-api
npm run start:dev card-processor
```

## 📡 API Endpoints

### POST /cards/issue
Solicita la emisión de una tarjeta.

**Request:**
```json
{
  "customer": {
    "documentType": "DNI",
    "documentNumber": "12345678",
    "fullName": "Juan Pérez",
    "age": 30,
    "email": "juan@example.com"
  },
  "product": {
    "type": "credit",
    "currency": "PEN",
    "simulateError": false
  }
}
```

**Response:**
```json
{
  "message": "Card issuance request received",
  "cardRequestId": "uuid-123"
}
```

**Errores:**
- `409 Conflict` - Cliente ya tiene tarjeta activa del tipo solicitado

## 🧪 Testing

```bash
# Ver archivo api-test.http para pruebas con REST Client
# O usar curl:

curl -X POST http://localhost:3001/cards/issue \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "documentType": "DNI",
      "documentNumber": "12345678",
      "fullName": "Juan Pérez",
      "age": 30,
      "email": "juan@example.com"
    },
    "product": {
      "type": "credit",
      "currency": "PEN",
      "simulateError": true
    }
  }'
```

## 🔧 Configuración

### Variables de Entorno

**PostgreSQL:**
- `POSTGRES_HOST` - Host de PostgreSQL (default: localhost)
- `POSTGRES_PORT` - Puerto de PostgreSQL (default: 5432)
- `POSTGRES_DATABASE` - Nombre de base de datos (default: challenge_io)
- `POSTGRES_USER` - Usuario (default: admin)
- `POSTGRES_PASSWORD` - Contraseña (default: admin123)

**Kafka:**
- `KAFKA_BROKERS` - Lista de brokers (default: localhost:9092)
- `KAFKA_CLIENT_ID` - ID del cliente
- `KAFKA_GROUP_ID` - ID del grupo de consumidores (solo card-processor)
- `KAFKAJS_NO_PARTITIONER_WARNING` - Silenciar warning de partitioner

**Issuer API:**
- `PORT` - Puerto del servidor (default: 3001)
- `NODE_ENV` - Entorno de ejecución

### Constantes Hardcodeadas

**Reintentos:**
- Max retries: 3
- Delays: [1000, 2000, 4000] ms

**Tarjetas:**
- Límite de crédito: $5000
- Expiración: 5 años desde emisión

## 📊 Monitoreo

### Ver mensajes en Kafka

```bash
# Listar topics
docker exec challenge-io-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consumir mensajes del topic principal
docker exec challenge-io-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic io.card.requested.v1 \
  --from-beginning

# Ver mensajes en DLQ
docker exec challenge-io-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic io.card.requested.v1.dlq \
  --from-beginning
```

### Consultar Base de Datos

```bash
docker exec -it challenge-io-postgres psql -U admin -d challenge_io

# Ver clientes
SELECT * FROM card_requests;

# Ver tracking
SELECT * FROM card_request_tracking ORDER BY created_at DESC;

# Ver tarjetas
SELECT * FROM cards;
```

## 🏗️ Estructura del Proyecto

```
challenge-io/
├── apps/
│   ├── issuer-api/           # API REST
│   │   ├── src/
│   │   │   ├── cards/        # Módulo de tarjetas
│   │   │   ├── entities/     # Entidades TypeORM
│   │   │   └── constants/    # Constantes de configuración
│   │   └── Dockerfile
│   └── card-processor/       # Microservicio Kafka
│       ├── src/
│       │   ├── card-processor/ # Lógica de procesamiento
│       │   ├── entities/     # Entidades compartidas
│       │   └── constants/    # Constantes de configuración
│       └── Dockerfile
├── scripts/
│   └── kafka-init.sh         # Script de inicialización de Kafka
├── docker-compose.yml        # Orquestación de servicios
└── README.md
```

## 🔄 Flujo de Procesamiento

1. Cliente envía POST a `/cards/issue`
2. Issuer API valida y crea `CardRequest` y tracking inicial
3. Mensaje se envía a topic `io.card.requested.v1`
4. Card Processor consume mensaje
5. Si `simulateError=true`:
   - Intenta con lógica de reintentos (50% éxito aleatorio)
   - Si falla 3 veces → envía a DLQ
6. Si `simulateError=false` o éxito aleatorio:
   - Envía a `io.card.processed.v1`
   - Genera tarjeta con número, CVV y fecha
7. Tracking se actualiza en cada paso

## 📝 Notas Importantes

- La base de datos usa `synchronize: true` (solo desarrollo)
- El número de tarjeta es aleatorio (16 dígitos)
- Un cliente puede tener múltiples tipos de tarjeta pero solo una activa por tipo
- Los mensajes enmascarados muestran solo últimos 4 dígitos

## 🤝 Contribución

Este es un proyecto de challenge técnico.

## 📄 Licencia

MIT

