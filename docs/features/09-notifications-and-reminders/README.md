# Feature 09: Notificaciones y Recordatorios Automáticos

## 📋 Objetivo
Implementar un sistema híbrido de notificaciones (**Web Push** vía VAPID para la PWA en iOS/iPadOS/macOS y **Correo Electrónico** transaccional). Un cron job diario programado en NestJS revisa los próximos vencimientos de tarjetas de crédito, servicios y deudas de terceros, enviando alertas preventivas antes de la fecha límite de pago.

---

## 👤 Historias de Usuario (HUs)

### HU-09.1: Registro de Suscripción Web Push (PWA)
> **Como** usuario con la PWA instalada en mi iPhone, iPad o Mac,  
> **Quiero** autorizar y registrar las notificaciones push de mi navegador/dispositivo,  
> **Para** recibir alertas directas en mi pantalla de bloqueo cuando se acerque una fecha de pago.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/notifications/web-push/subscribe` que guarda el endpoint y llaves (`keys: { p256dh, auth }`) del navegador.
- [x] Generación y exposición de la clave pública VAPID en `GET /api/notifications/web-push/public-key`.
- [x] Permite registrar múltiples dispositivos por usuario (ej. iPad, iPhone y Mac).

---

### HU-09.2: Notificaciones por Correo Electrónico
> **Como** usuario,  
> **Quiero** recibir un correo de resumen cuando una tarjeta o servicio esté por vencer en los próximos días,  
> **Para** tener un respaldo claro en mi bandeja de entrada con el monto y fecha límite.

**Criterios de Aceptación:**
- [x] Servicio de correo configurable vía SMTP o API de Resend mediante variables de entorno (`BUDGET_API_SMTP_HOST`, `BUDGET_API_SMTP_PORT`, `BUDGET_API_RESEND_API_KEY`, etc.).
- [x] Plantilla de correo HTML limpia con el detalle de cuentas por pagar y fechas de vencimiento.
- [x] Endpoint para disparar un correo de prueba `POST /api/notifications/test` o `POST /api/notifications/test-email`.

---

### HU-09.3: Cron Job Diario de Alertas de Vencimiento
> **Como** usuario,  
> **Quiero** que el sistema revise automáticamente cada mañana mis compromisos de los próximos días (ej. 3 días y 1 día antes),  
> **Para** no olvidar pagar ninguna tarjeta, factura de luz/internet o cobrar una deuda a tiempo.

**Criterios de Aceptación:**
- [x] Cron programado con `@nestjs/schedule` que se ejecuta diariamente (ej. 08:00 AM).
- [x] Busca tarjetas cuyo `paymentDueDay` ocurra en $N$ días (configurable, ej. 3 días antes).
- [x] Busca servicios no pagados del mes con fecha de corte cercana.
- [x] Busca deudas de terceros con fecha de vencimiento próxima para recordarte cobrarles.
- [x] Registra en una colección `NotificationLog` para evitar enviar duplicados el mismo día.

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-09.1: Esquema Mongoose `WebPushSubscription` y `NotificationLog`**
  - `src/modules/notifications/schemas/web-push-subscription.schema.ts`.
  - `src/modules/notifications/schemas/notification-log.schema.ts` (almacena `userId`, `targetType`, `targetId`, `channel`, `sentAt`).

- [x] **TICKET-09.2: Servicio de Web Push (`WebPushService`)**
  - Integrar librería `web-push`.
  - Configurar claves VAPID (`BUDGET_API_VAPID_PUBLIC_KEY`, `BUDGET_API_VAPID_PRIVATE_KEY`, `BUDGET_API_VAPID_SUBJECT`).
  - Método `sendPushToUser(userId, payload)`.

- [x] **TICKET-09.3: Servicio de Correo Electrónico (`EmailService`)**
  - Integrar `nodemailer` o cliente de Resend.
  - Método `sendDueReminderEmail(user, duesList)`.

- [x] **TICKET-09.4: Cron de Vencimientos (`DueReminderScheduler`)**
  - Configurar `@nestjs/schedule` en `AppModule`.
  - Tarea `@Cron(CronExpression.EVERY_DAY_AT_8AM)` que analiza:
    - Tarjetas con fecha de pago en los próximos 3 días.
    - Servicios no marcados como `isPaid` con vencimiento cercano.
    - Ingresos de deudas `isReceived: false` con vencimiento cercano.

- [x] **TICKET-09.5: Controlador `NotificationsController`**
  - Endpoints:
    - `GET /api/notifications/web-push/public-key`
    - `POST /api/notifications/web-push/subscribe`
    - `DELETE /api/notifications/web-push/unsubscribe`
    - `POST /api/notifications/test`

- [x] **TICKET-09.6: Pruebas Unitarias**
  - Probar lógica de detección de fechas próximas y prevención de envíos duplicados mediante `NotificationLog`.

---

## ✅ Verificación de la Feature
1. Obtener la clave pública VAPID mediante `GET /api/notifications/web-push/public-key`.
2. Probar el endpoint `POST /api/notifications/test` para comprobar la entrega de un correo o push de prueba.
3. Crear una tarjeta con fecha de pago dentro de 2 días y forzar la ejecución del cron; validar que se registre el log en `NotificationLog` y se emita la alerta.
