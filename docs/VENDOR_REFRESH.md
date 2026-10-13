# Vendor document refresh

Checked 13 October 2026. Re-read these pages before changing a lesson that names a version. The stamp lives in `data/course-versions.json`. `python3 scripts/check_vendor_versions.py --online` prints a PyPI alert when the Airflow major version moves. It does not rewrite lessons.

| Course | What the lessons were checked against | Where to look next |
|--------|----------------------------------------|--------------------|
| Airflow | Apache Airflow 3.3.2 on 17 September 2026, framed 13 October 2026 | https://airflow.apache.org/docs/ |
| dbt | Developer Hub, Fusion v2.0.8, dbt-core as the Apache-licensed runtime | https://docs.getdbt.com/ |
| ClickHouse | MergeTree, JSON type since 25.3, SharedMergeTree on Cloud | https://clickhouse.com/docs |
| PostgreSQL | 18.6 current on that date; 17, 16, and 15 supported; 14 through 12 November 2026 | https://www.postgresql.org/support/versioning/ |
| SQL Server | 2017, 2019, 2022, and 2025. 2016 extended support had ended 15 July 2026 | https://learn.microsoft.com/sql/sql-server/ |
| Redshift | zero-ETL, data sharing, RA3, Serverless, Spectrum caveats. Not DC2 for a new warehouse | https://docs.aws.amazon.com/redshift/ |
| Metabase | Cloud, self-host, embedding, models, permissions. No published application-database password | https://www.metabase.com/docs/ |
| Kubernetes | No single patch pin. Gateway API 1.5 notes cited Kubernetes 1.30 or later for that release | https://kubernetes.io/docs/ |
| Terraform | S3 locking is version-dependent. OpenTofu is a separate project | https://developer.hashicorp.com/terraform/docs |
| AWS DMS | Premigration assessment, Schema Conversion, and desktop SCT are three reports | https://docs.aws.amazon.com/dms/ |
| Snowflake | Thirteen lessons, two free. No patch version stamped | https://docs.snowflake.com/ |
| LLM | 2019 GPT-2 decoder is not ChatGPT | The model card for the tool named in the lesson |
| Python | Sessions 13 and 14 are matplotlib and seaborn | https://docs.python.org/3/ |

A course hub shows its own note and the date above. Do not type a newer version into a lesson until this table and `data/course-versions.json` change together.
