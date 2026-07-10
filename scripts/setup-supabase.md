# Setup Supabase - SCACR

## 1. Ejecutar migración

1. Ve a: https://supabase.com/dashboard/project/nwnldvzoxjjsmfeyouaw/sql/new
2. Abre el archivo `supabase/migrations/0001_schema_inicial.sql`
3. Copia TODO el contenido y pégalo en el SQL Editor
4. Haz clic en **Run** o presiona `Ctrl+Enter`
5. Espera a que termine (deberían crearse ~10 tablas)

## 2. Ejecutar seed

1. Abre una nueva pestaña en el SQL Editor
2. Abre el archivo `supabase/seed.sql`
3. Copia TODO el contenido y pégalo
4. Haz clic en **Run**

## 3. Configurar Auth (usuarios)

Después de la migración, crea usuarios en Supabase Auth:

1. Ve a: https://supabase.com/dashboard/project/nwnldvzoxjjsmfeyouaw/auth/users
2. Haz clic en **Add User**
3. Crea 4 usuarios (uno por rol):

| Email | Password | Rol |
|-------|----------|-----|
| admin@scacr.com | (contraseña segura) | Admin |
| tostador@scacr.com | (contraseña segura) | Tostador |
| recepcion@scacr.com | (contraseña segura) | Recepción |
| operador@scacr.com | (contraseña segura) | Operador |

4. Después de crear cada usuario, copia su UUID (User ID)
5. Ejecuta este SQL para vincularlos con los empleados:

```sql
UPDATE empleados SET id_auth = 'UUID-DEL-USUARIO-ADMIN' WHERE rol = 'Admin';
UPDATE empleados SET id_auth = 'UUID-DEL-USUARIO-TOSTADOR' WHERE rol = 'Tostador';
UPDATE empleados SET id_auth = 'UUID-DEL-USUARIO-RECEPCION' WHERE rol = 'Recepción';
UPDATE empleados SET id_auth = 'UUID-DEL-USUARIO-OPERADOR' WHERE rol = 'Operador';
```

## 4. Verificar

Ejecuta estas consultas para verificar:
```sql
SELECT * FROM empleados;
SELECT * FROM clientes;
SELECT * FROM ordenes_trabajo;
SELECT * FROM perfiles_tueste;
SELECT * FROM hitos_termicos;
```
