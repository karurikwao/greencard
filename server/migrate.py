import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def main():
    database_url = os.getenv('DATABASE_URL')
    setup_sql = os.getenv('SETUP_SQL_PATH', '/app/MASTER_SETUP_POSTGRES_v5.sql')

    if not database_url:
        print('[migrate] DATABASE_URL is not set; skipping database bootstrap.')
        return

    sql_path = Path(setup_sql)
    if not sql_path.exists():
        print(f'[migrate] Setup SQL not found at {sql_path}; skipping database bootstrap.')
        return

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.users')")
            already_initialized = cur.fetchone()[0] is not None

            if already_initialized:
                print('[migrate] Database already has core tables; skipping bootstrap.')
                return

            print('[migrate] Bootstrapping database schema...')
            cur.execute(sql_path.read_text(encoding='utf-8'))
        conn.commit()

    print('[migrate] Database bootstrap complete.')


if __name__ == '__main__':
    main()
