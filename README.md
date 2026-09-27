# Auditoria Cierres VAR

Aplicación web (HTML + JavaScript, sin backend) que lee el CSV de **Evidencias de Cierre de Caja** y genera un reporte por punto de venta (PDV) mostrando qué días quedaron con cierres pendientes de revisión.

No requiere instalación: se abre directamente en el navegador y todo el procesamiento ocurre en el propio dispositivo (el archivo no se sube a ningún servidor).

## ¿Qué hace?

A partir del CSV, por cada PDV calcula:

| Columna | Significado |
|---|---|
| **PDV** | Nombre del punto de venta |
| **Días pendientes** | Días del mes en los que el cierre quedó con `estado = pending` |
| **Días revisados** | Total de días distintos en los que ese PDV registró un cierre |
| **Pendientes** | Cantidad de días pendientes |
| **% Pendiente** | Pendientes ÷ Días revisados |
| **Estado** | Punto de color según la cantidad de días pendientes |

La tabla se ordena automáticamente de mayor a menor cantidad de pendientes.

### Colores del semáforo

- 🟢 **Verde**: 0 días pendientes
- 🟡 **Amarillo**: desde 1 día pendiente (configurable)
- 🔴 **Rojo**: desde 2 días pendientes (configurable)

Los umbrales se pueden cambiar desde los selectores **"Umbral amarillo"** y **"Umbral rojo"** en la parte superior de la tabla; el reporte se recalcula al instante.

## Cómo usarlo

1. Abre el archivo (o el link de la app) en el navegador.
2. Haz clic sobre el recuadro de carga, o arrastra ahí el archivo `.csv` de cierres de caja.
3. La tabla se genera automáticamente.
4. (Opcional) Ajusta los umbrales de amarillo/rojo si quieres un criterio distinto.
5. Haz clic en **"⬇ Exportar CSV"** para descargar la tabla ya procesada.

## Formato requerido del CSV

El archivo debe tener, como mínimo, estas columnas (con esos nombres exactos):

- `fecha` — fecha del cierre (se usa solo la parte `AAAA-MM-DD`)
- `pdv` — nombre del punto de venta
- `estado` — estado del cierre (`accepted`, `rejected` o `pending`)

Puede tener columnas adicionales (usuario, observaciones, montos, etc.); esas se ignoran para este reporte.

## Notas

- Solo se considera "pendiente" un día si al menos un registro de ese PDV en esa fecha tiene `estado = pending`.
- "Días revisados" cuenta fechas únicas por PDV, así que un PDV con menos días de operación en el período tendrá un total distinto a los demás (esto es normal, no un error).
- El archivo exportado conserva los mismos umbrales y el mismo orden que se ve en pantalla al momento de exportar.
