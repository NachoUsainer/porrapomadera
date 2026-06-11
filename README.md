# ⚽ Porra del Mundial

Web app para que tu grupo de amigos juegue la porra del Mundial: cada uno predice
los resultados de los partidos, se reparten puntos por acierto y hay un **ranking**
en vivo. Tú, como admin, metes los resultados reales y la app recalcula todo sola.

- **Registro sin líos**: tus amigos entran solo con su **nombre + un PIN de 4 dígitos**.
- **Predicciones** de resultado por partido (grupos y eliminatorias).
- **Bonus** en eliminatorias por acertar qué selección clasifica.
- **Ranking automático** con puntos, resultados exactos y ganadores acertados.
- **Partidos**: una vez cerrado cada partido (2h antes del inicio) se revelan las
  predicciones de **todos** los jugadores; antes permanecen ocultas para que nadie copie.
- **Panel de admin** protegido por contraseña para cargar partidos y resultados.

Stack: **Next.js** + **Supabase (Postgres)**. Se despliega gratis en **Vercel**.

---

## 1. Crear la base de datos (Supabase) — 5 min

1. Entra en [supabase.com](https://supabase.com), crea una cuenta y un **New project**
   (el plan gratuito sobra). Apunta la contraseña de la base de datos.
2. Cuando esté listo, ve a **SQL Editor → New query**, pega el contenido de
   [`supabase-schema.sql`](./supabase-schema.sql) y pulsa **Run**.
3. **Carga el calendario real del Mundial 2026**: ejecuta
   [`supabase-seed-mundial.sql`](./supabase-seed-mundial.sql) (las 48 selecciones, los 72
   partidos de grupos y las eliminatorias con sus cruces). Las horas están en CET/CEST.
   El México–Sudáfrica viene ya cargado con su resultado (2-0).
   - *(Alternativa para solo probar: [`supabase-seed-example.sql`](./supabase-seed-example.sql).)*
4. Ve a **Project Settings → API** y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** (en "Project API keys", el secreto) → `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ La clave `service_role` es secreta. Solo se usa en el servidor, nunca en el navegador.

---

## 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellénalo:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # la service_role
ADMIN_PASSWORD=la-que-tu-quieras          # para entrar a /admin
SESSION_SECRET=una-cadena-larga-aleatoria # firma las cookies de sesión
```

Genera un `SESSION_SECRET` aleatorio con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- `/register` → crear usuario (nombre + PIN)
- `/predictions` → rellenar resultados
- `/admin` → panel de administración (pide `ADMIN_PASSWORD`)

---

## 4. Cargar los partidos (como admin)

Entra en `/admin` con tu `ADMIN_PASSWORD`. Tienes dos formas de cargar el calendario:

### Opción A — Importar de golpe (recomendado)

En **Importar calendario**, pega un partido por línea con este formato:

```
fase ; local ; visitante ; AAAA-MM-DD HH:MM ; etiqueta
```

- `fase` = `group` | `r32` | `r16` | `qf` | `sf` | `third` | `final`
- `local` / `visitante` = nombre de la selección (se crean solas si no existen).
  En eliminatorias aún sin equipo, **déjalos vacíos** y usa la etiqueta (ej. `Octavos 1 (1A-2B)`).
- La **hora se interpreta en CET/CEST** (la del calendario; el Mundial cae en CEST = UTC+2).
- `etiqueta` es opcional.

Ejemplo:

```
group ; México ; Anfitrión rival ; 2026-06-11 20:00 ; Grupo A J1
r16 ;  ;  ; 2026-06-29 18:00 ; Octavos 1 (1A-2B)
```

### Opción B — A mano

**Añade selecciones** y luego **crea partidos** uno a uno (fase, local, visitante, fecha/hora).

### Cargar resultados y cruces

- Según se jueguen, pon el **resultado real**, marca *finalizado* y guarda. El ranking
  se actualiza al instante.
- En **eliminatorias**, cuando se conozca un cruce usa **"Asignar cruce"** para fijar las
  dos selecciones reales del partido, y al cargar el resultado elige también **qué
  selección clasifica** (bonus).

> ⏰ **Cierre de predicciones**: cada partido se cierra **2 horas antes** de su hora de
> inicio. Hasta ese momento, cada jugador puede cambiar su predicción libremente.

### Expulsar jugadores duplicados

En **Jugadores**, el admin puede **expulsar** a quien crea duplicado (la app marca como
"posible duplicado" los nombres que empiezan igual). Al expulsar se borran también sus
predicciones. ⚠️ No tiene vuelta atrás.

---

## 5. Desplegar en Vercel (para que entren tus amigos)

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. En **Environment Variables** añade las mismas 4 variables del `.env.local`.
4. **Deploy**. Vercel te da una URL (ej. `https://tu-porra.vercel.app`).
5. Pasa ese enlace a tu grupo. Cada uno se registra con su nombre y su PIN. 🎉

> El primer despliegue lee las variables de entorno en tiempo de ejecución, así que
> asegúrate de haberlas configurado en Vercel antes de probar.

---

## Reglas de puntuación

Se definen en [`src/lib/scoring.ts`](./src/lib/scoring.ts) y puedes cambiarlas:

| Acierto | Puntos |
|---|---|
| Resultado exacto (ej. predices 2‑1 y fue 2‑1) | **5** |
| Solo el ganador / empate (1‑X‑2) | **3** |
| (Eliminatorias) selección que clasifica | **+2** |

En caso de empate a puntos, desempata: nº de resultados exactos → nº de ganadores
acertados → orden alfabético.

---

## Notas

- La autenticación por **nombre + PIN** es deliberadamente simple (es una porra entre
  amigos, no un banco). El PIN evita que otra persona edite tus predicciones.
- Todo el acceso a datos va por el servidor con la clave `service_role`; las tablas
  tienen RLS activado sin políticas, así que no son accesibles desde el navegador.
- ¿Quieres que los resultados se carguen solos desde una API de fútbol en vez de a
  mano? Es ampliable: bastaría con un proceso que actualice la tabla `matches`.
```
