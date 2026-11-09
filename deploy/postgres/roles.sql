-- Role database Sagara Denim.
-- Dijalankan oleh init-roles.sh sebagai superuser/owner pada volume baru.
-- Password tidak pernah ditulis di file ini; nilainya berasal dari psql -v.

\set ON_ERROR_STOP on

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'owner_user', :'owner_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'owner_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'owner_user', :'owner_password')
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'backup_user', :'backup_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'backup_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'backup_user', :'backup_password')
\gexec

GRANT CONNECT ON DATABASE :"database_name" TO :"app_user", :"backup_user";

-- Database dan skema dimiliki role migrasi, bukan superuser bootstrap.
ALTER DATABASE :"database_name" OWNER TO :"owner_user";
ALTER SCHEMA public OWNER TO :"owner_user";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Owner boleh membuat database scratch untuk verifikasi restore, tetapi
-- bukan superuser dan tidak boleh membuat role.
ALTER ROLE :"owner_user" CREATEDB;

GRANT USAGE ON SCHEMA public TO :"app_user", :"backup_user";

-- Hak runtime aplikasi.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

-- Hak baca untuk backup.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"backup_user";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"backup_user";

-- Tabel dan sequence baru yang dibuat owner otomatis memberi hak yang sama.
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT SELECT ON TABLES TO :"backup_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO :"backup_user";
