#!/usr/bin/env python3
"""Render every lesson's step-through diagram as a labelled HTML flow.

Each diagram is a short story: a fixed row of named stages, one button per
step, and for every step a highlighted stage, a plain-language explanation
and a real example. Lessons listed in SPECS are written from the content
below. Older SVG diagrams elsewhere are converted to the same component,
keeping their labels and captions.

Run from the repository root:  python3 scripts/build_lesson_diagrams.py
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTION_RE = re.compile(
    r"<section\b[^>]*\bdata-dfd-diagram\b[^>]*>.*?</section>", re.S
)

# Node: (label, role). Step: (button, active node indexes, explanation, example).
# An example starting with "ui:" is a click path, not code.
SPECS: dict[str, dict] = {
    # ---------------------------------------------------------------- Snowflake
    "snowflake_course/meet-snowflake.html": {
        "title": "Follow one query through Snowflake",
        "intro": "Snowflake has three layers. Click each step to see which layer does the work.",
        "nodes": [
            ("Cloud services", "Login, planning, metadata"),
            ("Virtual warehouse", "Rented compute, billed per second"),
            ("Storage", "Your tables, stored once"),
        ],
        "steps": [
            ("Plan the query", [0],
             "Before any compute runs, cloud services checks your login and role, plans the query, and uses metadata to decide which pieces of the table it can skip.",
             "SELECT * FROM orders WHERE order_date = '2026-10-01';"),
            ("Run it", [1],
             "The warehouse does the actual reading and calculating. It wakes up for the query and is billed per second, with a 60-second minimum each time it resumes.",
             "USE WAREHOUSE compute_wh;"),
            ("Read the data", [2],
             "The table lives once, in compressed column files called micro-partitions. Storage is billed separately from compute, so a table nobody queries still costs storage but no compute.",
             "SHOW TABLES IN SCHEMA analytics.public;"),
        ],
    },
    "snowflake_course/architecture.html": {
        "title": "Two teams, one copy of the data",
        "intro": "A nightly load and a busy dashboard share the same tables without slowing each other down.",
        "nodes": [
            ("LOAD_WH", "Warehouse for the nightly load"),
            ("BI_WH", "Warehouse for dashboards"),
            ("Shared storage", "One copy of every table"),
            ("Cloud services", "Metadata and transactions"),
        ],
        "steps": [
            ("One copy of the data", [2],
             "Both teams read the same single copy of each table. Nobody exports or duplicates data to give another team access.",
             "GRANT SELECT ON ALL TABLES IN SCHEMA sales TO ROLE analyst;"),
            ("Two warehouses", [0, 1],
             "The load runs on LOAD_WH while dashboards run on BI_WH. They don't share CPU, so a heavy load can't make a dashboard slow.",
             "CREATE WAREHOUSE bi_wh WAREHOUSE_SIZE = XSMALL AUTO_SUSPEND = 60;"),
            ("Metadata desk", [3],
             "Cloud services keeps the minimum and maximum of each column for every micro-partition and coordinates transactions, so readers see a consistent table even mid-load.",
             "SELECT MAX(order_date) FROM orders;  -- often answered from metadata alone"),
        ],
    },
    "snowflake_course/trial-account.html": {
        "title": "From sign-up to a safe first query",
        "intro": "Three choices decide where your trial lives and how fast its credits are spent.",
        "nodes": [
            ("Sign-up form", "Edition, cloud and region"),
            ("Snowsight", "The browser workspace"),
            ("COMPUTE_WH", "The trial's warehouse"),
        ],
        "steps": [
            ("Pick a region", [0],
             "You choose an edition, a cloud (AWS, Azure or Google Cloud) and a region. Pick the region closest to your data. The account stays there; moving later means replicating into a new account.",
             "ui:Enterprise · AWS · Asia Pacific (Mumbai)"),
            ("Open Snowsight", [1],
             "Snowsight is where you work: SQL worksheets, a database explorer and your query history, all in the browser.",
             "SELECT CURRENT_ACCOUNT(), CURRENT_REGION();"),
            ("Suspend the warehouse", [2],
             "Trial credits are spent only while a warehouse is running. A 60-second auto-suspend stops an idle worksheet from draining them.",
             "ALTER WAREHOUSE compute_wh SET AUTO_SUSPEND = 60;"),
        ],
    },
    "snowflake_course/warehouses-cost.html": {
        "title": "Three ways to add power",
        "intro": "When queries feel slow, the fix depends on whether one query is big or many people are waiting.",
        "nodes": [
            ("Waiting queries", "Users in the queue"),
            ("Cluster 1", "X-Small: 1 credit per hour"),
            ("Cluster 2", "Added only during a rush"),
            ("Query acceleration", "Extra help for one big scan"),
        ],
        "steps": [
            ("One small cluster", [0, 1],
             "An X-Small warehouse uses 1 credit per hour, billed per second. Each size up doubles both the power and the credits per hour.",
             "CREATE WAREHOUSE wh WAREHOUSE_SIZE = XSMALL AUTO_SUSPEND = 60;"),
            ("A second cluster", [0, 1, 2],
             "When many people query at once, a multi-cluster warehouse (Enterprise edition) starts another cluster of the same size instead of making the queue wait, then stops it when the rush ends.",
             "ALTER WAREHOUSE wh SET MIN_CLUSTER_COUNT = 1 MAX_CLUSTER_COUNT = 3;"),
            ("Acceleration beside it", [1, 3],
             "When one query scans far more than the rest, the Query Acceleration Service lends it serverless compute so you don't have to upsize the whole warehouse. It is billed separately.",
             "ALTER WAREHOUSE wh SET ENABLE_QUERY_ACCELERATION = TRUE;"),
        ],
    },
    "snowflake_course/stages-loading.html": {
        "title": "How a file becomes rows",
        "intro": "A CSV in a bucket travels through a stage and a COPY command into a table.",
        "nodes": [
            ("Cloud bucket", "orders_2026_10_01.csv"),
            ("Stage", "A named place Snowflake can read"),
            ("COPY / Snowpipe", "Parses files into rows"),
            ("Table", "orders"),
        ],
        "steps": [
            ("File on a stage", [0, 1],
             "A stage is a named location: an internal stage inside Snowflake, or an external stage pointing at your S3, Azure or Google Cloud bucket.",
             "LIST @raw_stage;"),
            ("COPY into a table", [1, 2, 3],
             "COPY INTO reads the staged files with a file format and writes rows. It remembers which files it loaded for 64 days, so running it again does not duplicate rows.",
             "COPY INTO orders FROM @raw_stage FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);"),
            ("Pipe keeps watching", [0, 2, 3],
             "Snowpipe runs the same COPY for you when the bucket sends a new-file notification, usually within a minute, on serverless compute.",
             "CREATE PIPE orders_pipe AUTO_INGEST = TRUE AS COPY INTO orders FROM @raw_stage;"),
        ],
    },
    "snowflake_course/sql-analytics.html": {
        "title": "From raw rows to a fast answer",
        "intro": "Filter early, open nested JSON into rows, then let the query profile tell you what was slow.",
        "nodes": [
            ("orders table", "Typed columns + a JSON items column"),
            ("Your query", "WHERE, FLATTEN, GROUP BY"),
            ("Result", "Rows you can chart"),
            ("Query profile", "Where the time went"),
        ],
        "steps": [
            ("Filter rows", [0, 1],
             "A WHERE clause on a typed column such as order_date lets Snowflake skip micro-partitions that cannot match, so less data is read.",
             "SELECT * FROM orders WHERE order_date >= '2026-10-01';"),
            ("Open the array", [1, 2],
             "LATERAL FLATTEN turns a JSON array into one row per element, so ordinary SQL can count and group the items inside each order.",
             "SELECT o.id, i.value:sku::STRING AS sku\nFROM orders o, LATERAL FLATTEN(input => o.items) i;"),
            ("Read the profile", [3],
             "The query profile shows partitions scanned against the total, any spilling to disk, and the slowest step. Fix that step, not a guess.",
             "ui:Query History → your query → Query Profile → Partitions scanned"),
        ],
    },
    "snowflake_course/table-design.html": {
        "title": "Skip, rewind and copy a table",
        "intro": "Micro-partitions are why Snowflake can skip data, show you the past and copy a table instantly.",
        "nodes": [
            ("orders table", "Hundreds of micro-partitions"),
            ("Partition metadata", "Min and max of each column"),
            ("Older versions", "Kept for the retention period"),
            ("orders_dev clone", "Points at the same partitions"),
        ],
        "steps": [
            ("Skip a partition", [0, 1],
             "Each micro-partition records the minimum and maximum of every column. A filter on order_date lets Snowflake skip every partition whose range cannot match. This is called pruning.",
             "SELECT * FROM orders WHERE order_date = '2026-10-01';"),
            ("Travel back", [0, 2],
             "An update writes new partitions and keeps the old ones for the retention period: 1 day by default, up to 90 days on Enterprise. You can query the table as it was.",
             "SELECT * FROM orders AT (OFFSET => -3600);  -- one hour ago"),
            ("Clone the table", [0, 3],
             "A zero-copy clone points at the same partitions, so it costs no extra storage until one side changes. Only changed partitions are new.",
             "CREATE TABLE orders_dev CLONE orders;"),
        ],
    },
    "snowflake_course/streams-tasks.html": {
        "title": "Process only what changed",
        "intro": "A stream remembers where you stopped, a task acts on it, and a dynamic table can replace both.",
        "nodes": [
            ("orders", "Source table"),
            ("orders_stream", "Bookmark of new changes"),
            ("merge_orders task", "SQL on a schedule"),
            ("Reporting table", "Always up to date"),
        ],
        "steps": [
            ("Bookmark the change", [0, 1],
             "A stream keeps an offset on a table and shows the rows inserted, updated or deleted since it was last read. It does not copy the table.",
             "CREATE STREAM orders_stream ON TABLE orders;"),
            ("Task reads it", [1, 2, 3],
             "A task runs SQL on a schedule. With SYSTEM$STREAM_HAS_DATA it skips runs when nothing changed. Using the stream in a MERGE moves the bookmark forward.",
             "CREATE TASK merge_orders WAREHOUSE = wh SCHEDULE = '5 MINUTE'\n  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')\n  AS MERGE INTO daily_sales ...;"),
            ("Dynamic table refreshes", [0, 3],
             "A dynamic table is just a query plus a target lag. Snowflake keeps it refreshed, incrementally when it can, without you writing the stream and task.",
             "CREATE DYNAMIC TABLE daily_sales TARGET_LAG = '15 minutes' WAREHOUSE = wh\n  AS SELECT order_date, SUM(amount) FROM orders GROUP BY 1;"),
        ],
    },
    "snowflake_course/governance-horizon.html": {
        "title": "Who sees the email column",
        "intro": "Access flows from user to role to table, and a policy on the column decides what each role sees.",
        "nodes": [
            ("Asha (user)", "A person who logs in"),
            ("ANALYST role", "Holds the privileges"),
            ("customers.email", "Column with a masking policy"),
            ("Horizon", "Policies, tags and access history"),
        ],
        "steps": [
            ("Grant a role", [0, 1],
             "Privileges are granted to roles, never straight to people. Asha gets access by being granted the role.",
             "GRANT SELECT ON TABLE customers TO ROLE analyst;\nGRANT ROLE analyst TO USER asha;"),
            ("Mask a column", [1, 2],
             "A masking policy is a rule attached to the column. At query time it decides whether this role sees the real email or a masked value.",
             "CREATE MASKING POLICY email_mask AS (v STRING) RETURNS STRING ->\n  CASE WHEN CURRENT_ROLE() = 'PII_READER' THEN v ELSE '***' END;"),
            ("Horizon keeps the rule", [2, 3],
             "Horizon is the name for Snowflake's governance features together. The policy follows the column into every query, share and dashboard, and access history records who read it.",
             "ALTER TABLE customers MODIFY COLUMN email SET MASKING POLICY email_mask;"),
        ],
    },
    "snowflake_course/iceberg-unstructured.html": {
        "title": "Data that lives in your own bucket",
        "intro": "Iceberg tables keep open files other engines can read; directory tables let SQL find PDFs and images.",
        "nodes": [
            ("Your bucket", "S3, Azure or Google Cloud"),
            ("External volume", "Location + access role"),
            ("Iceberg table", "Parquet files + Iceberg metadata"),
            ("Directory table", "A list of files on a stage"),
        ],
        "steps": [
            ("Your bucket", [0, 1],
             "An external volume tells Snowflake where your bucket is and which role it may use. The data stays in your own cloud account.",
             "CREATE EXTERNAL VOLUME lake_vol STORAGE_LOCATIONS = ( ... );"),
            ("Iceberg metadata", [1, 2],
             "An Iceberg table writes Parquet data files plus Iceberg metadata beside them, so Spark, Trino or another engine can read the same table.",
             "CREATE ICEBERG TABLE events (id INT, ts TIMESTAMP)\n  CATALOG = 'SNOWFLAKE' EXTERNAL_VOLUME = 'lake_vol' BASE_LOCATION = 'events/';"),
            ("A file list", [0, 3],
             "For PDFs and images, a directory table on a stage lists every file with its path and size, so SQL can pick files to process.",
             "SELECT relative_path, size FROM DIRECTORY(@docs_stage);"),
        ],
    },
    "snowflake_course/snowpark-python.html": {
        "title": "Python that runs next to the data",
        "intro": "Snowpark code looks like pandas but the work happens inside Snowflake, not on your laptop.",
        "nodes": [
            ("Your Python", "Notebook or script"),
            ("DataFrame plan", "Turned into SQL, not yet run"),
            ("Warehouse", "Runs the SQL near the data"),
            ("Python UDF", "Your function, callable from SQL"),
        ],
        "steps": [
            ("Describe the plan", [0, 1],
             "DataFrame calls do not download data. Each call adds to a plan that Snowpark turns into SQL.",
             "df = session.table(\"orders\").filter(col(\"amount\") > 100)"),
            ("Warehouse runs it", [1, 2],
             "Nothing runs until an action such as collect() or save_as_table(). Then the generated SQL runs on the warehouse, and only the result comes back.",
             "df.group_by(\"region\").agg(sum_(\"amount\")).collect()"),
            ("UDF per value", [2, 3],
             "A Python UDF runs your function inside Snowflake for each value, and anyone can call it from plain SQL.",
             "SELECT clean_phone(phone) FROM customers;"),
        ],
    },
    "snowflake_course/cortex-ai.html": {
        "title": "Three ways to use AI on your data",
        "intro": "Run a model on each row, search documents, or let an agent choose which of those to use.",
        "nodes": [
            ("Your tables", "Tickets, reviews, documents"),
            ("AI SQL functions", "A model applied row by row"),
            ("Cortex Search", "An index over text"),
            ("Cortex Agent", "Chooses a tool per question"),
        ],
        "steps": [
            ("SQL function", [0, 1],
             "AI SQL functions such as AI_CLASSIFY run a model on each row straight from SQL. You pay for the tokens processed.",
             "SELECT AI_CLASSIFY(ticket_text, ['billing', 'bug', 'other']) FROM tickets;"),
            ("Search index", [0, 2],
             "Cortex Search builds an index over a text column and keeps it refreshed, so an app can fetch the most relevant passages for a question.",
             "CREATE CORTEX SEARCH SERVICE docs_search ON chunk\n  WAREHOUSE = wh TARGET_LAG = '1 hour'\n  AS SELECT chunk FROM doc_chunks;"),
            ("Agent chooses a tool", [2, 3],
             "A Cortex Agent reads the question and picks a tool: Cortex Analyst for numbers in tables, Cortex Search for answers in documents.",
             "ui:“What was revenue last month?” → Cortex Analyst · “What is our refund policy?” → Cortex Search"),
        ],
    },
    "snowflake_course/dbt-airflow-production.html": {
        "title": "A change on its way to production",
        "intro": "Test on a free copy, run on a schedule, and keep the receipt.",
        "nodes": [
            ("Pull request", "A dbt model change"),
            ("CI clone", "Zero-copy copy of production"),
            ("Airflow + dbt build", "Scheduled production run"),
            ("Query history", "What ran, how long, what it cost"),
        ],
        "steps": [
            ("Clone for CI", [0, 1],
             "Each pull request runs dbt against a zero-copy clone of production, so tests use real-shaped data without any risk to it.",
             "CREATE DATABASE ci_pr_42 CLONE analytics;"),
            ("Airflow runs dbt", [2],
             "After merging, an Airflow DAG starts dbt build on a schedule. dbt runs models and their tests in dependency order.",
             "dbt build --target prod"),
            ("Read the history", [2, 3],
             "Query history shows each statement, its warehouse, its run time and the data it scanned: the receipt for a failed or expensive run.",
             "SELECT query_text, total_elapsed_time\nFROM snowflake.account_usage.query_history\nWHERE query_tag = 'dbt';"),
        ],
    },
    # ---------------------------------------------------------------- Metabase
    "metabase_course/meet-metabase.html": {
        "title": "Follow one question",
        "intro": "A chart in Metabase is a question sent to your own database every time someone opens it.",
        "nodes": [
            ("Your database", "Where the data really lives"),
            ("Metabase", "Turns clicks into SQL"),
            ("Reader", "Sees a chart or a number"),
        ],
        "steps": [
            ("Database", [0],
             "Your data stays in your database, for example PostgreSQL. Metabase keeps no copy of it; it asks the database each time.",
             "SELECT SUM(total) FROM orders WHERE created_at >= '2026-10-01';"),
            ("Metabase", [0, 1],
             "Metabase turns choices in the query builder into SQL, sends it, and caches the answer only if caching is switched on.",
             "ui:New → Question → Orders → Sum of Total"),
            ("Reader", [1, 2],
             "The reader sees the result as a chart, limited by their group's permissions, and can click a bar to see the rows behind it.",
             "ui:Click a bar → View these Orders"),
        ],
    },
    "metabase_course/installation.html": {
        "title": "Two databases, on purpose",
        "intro": "Metabase needs one database for its own settings and connects to another for your data.",
        "nodes": [
            ("Application database", "Users, questions, dashboards"),
            ("Metabase server", "JAR or Docker container"),
            ("Your warehouse", "The data you analyse"),
        ],
        "steps": [
            ("App database", [0],
             "Metabase saves its users, questions and dashboards in an application database. Use PostgreSQL in production, not the default H2 file, which is easy to corrupt and lose.",
             "MB_DB_TYPE=postgres\nMB_DB_HOST=db.internal\nMB_DB_DBNAME=metabase"),
            ("Metabase", [0, 1],
             "The Metabase server reads those settings when it starts.",
             "docker run -d -p 3000:3000 --env-file metabase.env metabase/metabase"),
            ("Warehouse", [1, 2],
             "Your data lives in a separate database that you add under Admin → Databases, ideally with a read-only user.",
             "CREATE USER metabase_ro WITH PASSWORD '...';\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_ro;"),
        ],
    },
    "metabase_course/questions.html": {
        "title": "Three steps, in order",
        "intro": "Every query-builder question is filter, then summarise, then chart.",
        "nodes": [
            ("Filter", "Keep only the rows you need"),
            ("Summarize", "Group and calculate"),
            ("Visualize", "Pick the chart"),
        ],
        "steps": [
            ("Filter", [0],
             "Choose the table, then narrow the rows. Here: only orders created in the last 30 days.",
             "ui:Orders → Filter → Created At → Previous 30 days"),
            ("Summarize", [0, 1],
             "Group the remaining rows and calculate a number for each group: total sales per week.",
             "ui:Summarize → Sum of Total → by Created At: Week"),
            ("Chart", [1, 2],
             "Metabase suggests a chart for the shape of the answer. A value over time becomes a line.",
             "ui:Visualization → Line"),
        ],
    },
    "metabase_course/sql-queries.html": {
        "title": "Three kinds of blank",
        "intro": "Variables in double curly brackets turn a SQL query into a reusable filter.",
        "nodes": [
            ("Text variable", "{{city}} becomes a typed value"),
            ("Field filter", "{{created}} maps to a column"),
            ("Optional clause", "[[ ... ]] disappears when empty"),
        ],
        "steps": [
            ("Value", [0],
             "A text or number variable is replaced with whatever the reader types into the filter box.",
             "SELECT * FROM orders WHERE city = {{city}}"),
            ("Field", [1],
             "A field filter is linked to a real column, so readers get Metabase's date picker and Metabase writes the condition. Do not put the column name before it.",
             "SELECT * FROM orders WHERE {{created}}"),
            ("Optional", [2],
             "Square brackets make part of the query optional. If the reader leaves the filter empty, the whole bracketed part is dropped.",
             "SELECT * FROM orders WHERE true [[AND city = {{city}}]]"),
        ],
    },
    "metabase_course/models.html": {
        "title": "Start from the model",
        "intro": "Define clean data and key numbers once, then build every question on top.",
        "nodes": [
            ("Model", "A curated, described table"),
            ("Metric", "A calculation defined once"),
            ("Question", "Built from both"),
        ],
        "steps": [
            ("Model", [0],
             "A model is a saved, cleaned-up table, for example Completed orders, with descriptions on each column. It is the trusted starting point.",
             "ui:New → Model → Orders where Status = Completed"),
            ("Metric", [0, 1],
             "A metric defines a calculation once, such as Revenue = Sum of Total on completed orders, so every team shows the same number.",
             "ui:New → Metric → Completed orders → Sum of Total"),
            ("Question", [1, 2],
             "New questions start from the model and pick the metric instead of rebuilding the filters each time.",
             "ui:New → Question → Completed orders → Revenue by Month"),
        ],
    },
    "metabase_course/dashboards.html": {
        "title": "From a filter to an inbox",
        "intro": "One dashboard filter updates every card, and a subscription delivers the result.",
        "nodes": [
            ("Dashboard filter", "For example, Date"),
            ("Cards", "Each linked to a column"),
            ("Subscription", "Email or Slack on a schedule"),
        ],
        "steps": [
            ("Filter", [0],
             "A dashboard filter is wired to a column on each card it should affect.",
             "ui:Edit dashboard → Add filter → Date → link to Orders.Created At"),
            ("Cards", [0, 1],
             "When someone picks a value, every linked card reruns its question with that value.",
             "ui:Date = Last week → all four cards refresh"),
            ("Inbox", [1, 2],
             "A subscription sends the dashboard by email or Slack on a schedule, with the filter values you saved.",
             "ui:Sharing → Subscriptions → Every Monday 09:00 → #sales"),
        ],
    },
    "metabase_course/sharing.html": {
        "title": "How a reader gets in",
        "intro": "Three doors, each with a different level of control over who can see what.",
        "nodes": [
            ("Signed-in user", "Group permissions apply"),
            ("Public link", "Anyone with the URL"),
            ("Embedded chart", "Inside your own app"),
        ],
        "steps": [
            ("Login", [0],
             "People who sign in see only the collections and data their groups allow.",
             "ui:Admin → People → add to group ‘Sales’"),
            ("Public", [1],
             "A public link works without logging in. An admin must enable it, and you cannot limit it to particular people, so never use it for private data.",
             "ui:Sharing → Create a public link"),
            ("Embed", [2],
             "Embedding puts a chart inside your own app. With signed embedding, your server signs a token that locks filters, so each customer sees only their own rows.",
             "ui:Sharing → Embed → Locked parameter: customer_id"),
        ],
    },
    "metabase_course/admin.html": {
        "title": "What an admin sets",
        "intro": "People go into groups, groups get data permissions, and the audit trail shows what happened.",
        "nodes": [
            ("People and groups", "Who belongs where"),
            ("Data permissions", "What each group can query"),
            ("Usage and audit", "Who viewed or changed what"),
        ],
        "steps": [
            ("People", [0],
             "Add users to groups. Permissions are given to groups, not to individual people.",
             "ui:Admin → People → Groups → Finance"),
            ("Data", [0, 1],
             "For each group and database, decide whether they can query it, use only the query builder, or write their own SQL.",
             "ui:Admin → Permissions → Finance → Warehouse → Query builder only"),
            ("Audit", [2],
             "Usage analytics (on Pro and Enterprise) shows who viewed, created or changed questions and dashboards.",
             "ui:Usage analytics → Activity log"),
        ],
    },
    "metabase_course/production.html": {
        "title": "The production order",
        "intro": "Upgrade in this order every time and you can always go back.",
        "nodes": [
            ("Backup", "Copy the application database"),
            ("Upgrade", "Start the new version"),
            ("Health check", "Confirm before users return"),
        ],
        "steps": [
            ("Backup", [0],
             "Back up the application database first. Upgrades change its structure, and the only reliable way back is restoring that backup.",
             "pg_dump -Fc metabase > metabase-before-upgrade.dump"),
            ("Upgrade", [0, 1],
             "Replace the container with the new version. On start-up Metabase migrates the application database.",
             "docker pull metabase/metabase:latest && docker compose up -d"),
            ("Health", [1, 2],
             "Wait until the health endpoint reports ok, then open a few key dashboards before telling users.",
             "curl https://metabase.example.com/api/health   # {\"status\":\"ok\"}"),
        ],
    },
    # ---------------------------------------------------------------- Redshift
    "redshift_course/architecture.html": {
        "title": "Where a query goes",
        "intro": "One node plans, many nodes work, and storage sits underneath them all.",
        "nodes": [
            ("Leader node", "Receives and plans SQL"),
            ("Compute nodes", "Slices work in parallel"),
            ("Managed storage", "Data on S3 with a local cache"),
        ],
        "steps": [
            ("Leader", [0],
             "The leader node receives your SQL, makes a plan and splits it into steps for the compute nodes.",
             "EXPLAIN SELECT region, SUM(amount) FROM sales GROUP BY region;"),
            ("Compute", [0, 1],
             "Each compute node is divided into slices. Every slice works on its own share of the rows at the same time, then results return to the leader.",
             "SELECT node, slice FROM stv_slices;"),
            ("Storage", [1, 2],
             "On RA3 nodes, data lives in Redshift Managed Storage on S3 with a fast local cache, so storage grows without adding nodes.",
             "ui:Cluster → Node type: ra3.xlplus"),
        ],
    },
    "redshift_course/setup.html": {
        "title": "Three gates before SQL",
        "intro": "A connection fails if any one of these is closed.",
        "nodes": [
            ("AWS account and IAM", "Who may create or connect"),
            ("Network", "VPC and security group, port 5439"),
            ("Database user", "Runs the SQL"),
        ],
        "steps": [
            ("Account", [0],
             "Your IAM user or role must be allowed to create the cluster or workgroup and to get credentials for it.",
             "ui:IAM → Policies → AmazonRedshiftFullAccess (lab only)"),
            ("Network", [0, 1],
             "The security group must allow inbound traffic on port 5439 from your IP. If it doesn't, the connection simply times out.",
             "ui:Security group → Inbound rule → TCP 5439 → My IP"),
            ("Query", [1, 2],
             "Only then can a database user connect from Query Editor v2 or a SQL client and run a query.",
             "SELECT current_user, version();"),
        ],
    },
    "redshift_course/data-loading.html": {
        "title": "Two ways in",
        "intro": "Bulk-load files with COPY, or let a zero-ETL integration replicate a database for you.",
        "nodes": [
            ("Files in S3", "Split and compressed"),
            ("COPY", "Parallel load into a table"),
            ("Zero-ETL", "Continuous copy from Aurora, RDS or DynamoDB"),
        ],
        "steps": [
            ("Files", [0],
             "Split large exports into several compressed files so every slice can load at the same time.",
             "s3://bucket/sales/part-0001.parquet … part-0016.parquet"),
            ("COPY", [0, 1],
             "COPY reads all the files in a prefix in parallel. It is far faster than inserting rows one at a time.",
             "COPY sales FROM 's3://bucket/sales/'\nIAM_ROLE default FORMAT AS PARQUET;"),
            ("Zero-ETL", [2],
             "A zero-ETL integration keeps Redshift updated from Aurora, RDS or DynamoDB continuously, without you building a pipeline.",
             "ui:Redshift → Zero-ETL integrations → Create → Aurora MySQL source"),
        ],
    },
    "redshift_course/table-design.html": {
        "title": "Three choices on a table",
        "intro": "Where rows live, what order they are stored in, and how they are compressed.",
        "nodes": [
            ("Distribution", "Which slice holds each row"),
            ("Sort key", "Order of rows on disk"),
            ("Encoding", "How columns are compressed"),
        ],
        "steps": [
            ("Dist", [0],
             "A DISTKEY on a join column puts matching rows on the same slice. DISTSTYLE ALL copies a small table everywhere. AUTO lets Redshift choose.",
             "CREATE TABLE sales (...) DISTKEY(customer_id);"),
            ("Sort", [1],
             "A sort key stores rows in order, so a date filter can skip whole blocks using zone maps.",
             "CREATE TABLE events (...) SORTKEY(event_time);"),
            ("Encode", [2],
             "Compression shrinks storage and the amount of data each query reads. ENCODE AUTO is the default.",
             "SELECT \"column\", encoding FROM pg_table_def WHERE tablename = 'sales';"),
        ],
    },
    "redshift_course/sql-queries.html": {
        "title": "From a table to the catalog",
        "intro": "Write familiar SQL, then use system views to learn about your own tables.",
        "nodes": [
            ("Tables", "Rows in a schema"),
            ("SQL", "PostgreSQL-style, plus analytics"),
            ("System catalog", "Size, skew and sort state"),
        ],
        "steps": [
            ("Tables", [0],
             "Your data sits in tables inside schemas, just as in PostgreSQL.",
             "SELECT * FROM public.sales LIMIT 10;"),
            ("SQL", [0, 1],
             "Redshift SQL looks like PostgreSQL and adds analytic features such as window functions.",
             "SELECT region, amount,\n  RANK() OVER (PARTITION BY region ORDER BY amount DESC) AS rnk\nFROM sales;"),
            ("Catalog", [2],
             "System views describe the tables themselves: how big they are, how unevenly they are spread, and how much is unsorted.",
             "SELECT \"table\", size, skew_rows, unsorted FROM svv_table_info;"),
        ],
    },
    "redshift_course/performance.html": {
        "title": "Three places time goes",
        "intro": "A slow query is waiting, reading too much, or recomputing something it already knew.",
        "nodes": [
            ("Queue", "Waiting for a slot"),
            ("Scan", "Reading blocks from disk"),
            ("Result cache", "Answering repeats instantly"),
        ],
        "steps": [
            ("Queue", [0],
             "Workload management may hold a query until a slot is free. Check queue time before tuning the SQL.",
             "SELECT query_id, queue_time, execution_time FROM sys_query_history ORDER BY start_time DESC LIMIT 20;"),
            ("Scan", [1],
             "Reading far more blocks than needed is the most common cause. A sort key and a selective filter let Redshift skip blocks.",
             "WHERE event_time >= '2026-10-01'  -- with SORTKEY(event_time)"),
            ("Cache", [2],
             "If the same query runs again and the data has not changed, Redshift returns the cached result without running it.",
             "SET enable_result_cache_for_session TO on;"),
        ],
    },
    "redshift_course/spectrum-serverless.html": {
        "title": "Three homes for bytes",
        "intro": "Query files in S3, read another team's tables, or pay only while queries run.",
        "nodes": [
            ("Data lake (Spectrum)", "Parquet in S3, not loaded"),
            ("Data sharing", "Live tables across clusters"),
            ("Serverless", "Billed in RPU-hours"),
        ],
        "steps": [
            ("Lake", [0],
             "Redshift Spectrum queries Parquet files in S3 through an external schema, without loading them first.",
             "CREATE EXTERNAL SCHEMA lake FROM DATA CATALOG\nDATABASE 'lake' IAM_ROLE default;"),
            ("Share", [1],
             "Data sharing lets another cluster or workgroup read your live tables without copying them.",
             "CREATE DATASHARE sales_share;\nALTER DATASHARE sales_share ADD TABLE public.sales;"),
            ("RPU", [2],
             "Redshift Serverless charges for capacity (RPU-hours) only while queries run. Base capacity sets how much it starts with.",
             "ui:Workgroup → Base capacity: 8 RPU"),
        ],
    },
    "redshift_course/production.html": {
        "title": "Lock, spare key, window",
        "intro": "Limit access, keep restorable snapshots, and watch the right signals.",
        "nodes": [
            ("Access", "Roles and least privilege"),
            ("Snapshots", "Your spare key"),
            ("Signals", "Alarms and maintenance window"),
        ],
        "steps": [
            ("Access", [0],
             "Give each team a role with only what it needs, and keep the cluster encrypted and off the public internet.",
             "CREATE ROLE analyst;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO ROLE analyst;"),
            ("Snapshot", [1],
             "Automated snapshots run on their own. Take a manual snapshot before big changes. A restore creates a new cluster.",
             "ui:Cluster → Actions → Create snapshot"),
            ("Signals", [2],
             "Set CloudWatch alarms on CPU, disk use and query queueing, and pick a maintenance window for patches.",
             "ui:CloudWatch → Alarms → PercentageDiskSpaceUsed > 80%"),
        ],
    },
    # --------------------------------------------------------------- AWS DMS
    "dms_course/validation.html": {
        "title": "Is the copy right, and how far behind?",
        "intro": "During a migration the source keeps changing, so you check two things: lag and row equality.",
        "nodes": [
            ("Source database", "Still taking writes"),
            ("CDC stream", "Changes on their way"),
            ("Target database", "The copy being built"),
        ],
        "steps": [
            ("Source", [0],
             "The application is still writing to the source while DMS copies it, so the target is always catching up.",
             "ui:Source: 1,250 new orders in the last hour"),
            ("Latency", [0, 1],
             "CDC latency is how many seconds the target is behind the source. Watch it fall close to zero before you plan a cutover.",
             "ui:CloudWatch → CDCLatencySource / CDCLatencyTarget"),
            ("Target", [1, 2],
             "Data validation compares rows between source and target and reports mismatches. It checks data, not whether the application behaves the same.",
             "ui:Task → Table statistics → Validation state: Validated"),
        ],
    },
    # ----------------------------------------------------- SQL Server, Postgres
    "mssql_course/datasets.html": {
        "title": "Load, then ask",
        "intro": "One script builds the practice tables; a quick count proves it worked.",
        "nodes": [
            ("SampleDB_CreateAndLoad.sql", "Creates Products, Customers, Orders"),
            ("SSMS", "Runs the script in SampleDB"),
            ("Check", "Counts and a first join"),
        ],
        "steps": [
            ("Script", [0],
             "The script drops and recreates three tables. It is safe to run again, but not in a database whose tables of those names you need.",
             "USE SampleDB;\n-- DROP / CREATE Products, Customers, Orders"),
            ("SSMS", [0, 1],
             "Open the file in SQL Server Management Studio, make sure SampleDB is selected, and press F5.",
             "ui:File → Open → SampleDB_CreateAndLoad.sql → Execute (F5)"),
            ("Check", [1, 2],
             "Count the rows, then try a first join. If a query errors, read which object name was wrong.",
             "SELECT COUNT(*) FROM dbo.Orders;\nSELECT p.Category, SUM(o.Quantity * p.UnitPrice) AS revenue\nFROM dbo.Orders o JOIN dbo.Products p ON p.ProductID = o.ProductID\nGROUP BY p.Category;"),
        ],
    },
    "postgres_course/replication.html": {
        "title": "A page, a bookmark, a copy",
        "intro": "Every change is written to the WAL, a slot remembers what the standby still needs, and the standby replays it.",
        "nodes": [
            ("Primary", "Writes every change to the WAL"),
            ("Replication slot", "Keeps WAL the standby hasn't read"),
            ("Standby", "Replays the WAL, read-only"),
        ],
        "steps": [
            ("Primary", [0],
             "Every change is first written to the write-ahead log (WAL), page by page, before it is applied to the tables.",
             "SELECT pg_current_wal_lsn();"),
            ("Slot", [0, 1],
             "A replication slot stops the primary from deleting WAL the standby still needs. A forgotten slot keeps WAL forever and can fill the disk.",
             "SELECT slot_name, active, restart_lsn FROM pg_replication_slots;"),
            ("Standby", [1, 2],
             "The standby streams the WAL and replays it, staying a read-only copy you can promote if the primary fails.",
             "SELECT client_addr, state, replay_lag FROM pg_stat_replication;"),
        ],
    },
}


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def render(spec: dict) -> str:
    nodes = spec["nodes"]
    steps = spec["steps"]
    total = len(steps)
    ids = [f"step{i + 1}" for i in range(total)]
    out = [
        '<section class="section dfd-diagram dfd-flow" data-dfd-diagram data-dfd-flow data-dfd-reveal>',
        f'<h2>{esc(spec["title"])}</h2>',
    ]
    if spec.get("intro"):
        out.append(f'<p class="dfd-flow-intro">{esc(spec["intro"])}</p>')
    out.append(f'<div class="dfd-diagram-controls dfd-flow-controls" role="group" aria-label="{esc(spec["title"])}: steps">')
    for index, (label, _active, _text, _example) in enumerate(steps):
        pressed = "true" if index == 0 else "false"
        out.append(
            f'<button type="button" data-dfd-diagram-step="{ids[index]}" aria-pressed="{pressed}">'
            f'<span class="dfd-flow-num" aria-hidden="true">{index + 1}</span>{esc(label)}</button>'
        )
    out.append("</div>")
    for index, (label, active, text, example) in enumerate(steps):
        hidden = "" if index == 0 else " hidden"
        out.append(f'<div class="dfd-flow-panel" data-dfd-diagram-panel="{ids[index]}"{hidden}>')
        out.append(f'<ol class="dfd-flow-track" aria-label="Step {index + 1}: {esc(label)}">')
        for position, node in enumerate(nodes):
            name, role = node if isinstance(node, tuple) else (node, "")
            classes = ["dfd-flow-node"]
            if position in active:
                classes.append("is-active")
                if position > 0 and (position - 1) in active:
                    classes.append("is-fed")
            state = ' aria-current="step"' if position in active else ""
            role_html = f'<span class="dfd-flow-role">{esc(role)}</span>' if role else ""
            out.append(
                f'<li class="{" ".join(classes)}"{state}><span class="dfd-flow-label">{esc(name)}</span>{role_html}</li>'
            )
        out.append("</ol>")
        out.append('<div class="dfd-flow-explain">')
        out.append(
            f'<p class="dfd-flow-caption"><span class="dfd-flow-count">Step {index + 1} of {total}</span>{esc(text)}</p>'
        )
        if example:
            if example.startswith("ui:"):
                out.append(f'<p class="dfd-flow-example dfd-flow-example-ui">{esc(example[3:])}</p>')
            else:
                out.append(f'<pre class="dfd-flow-example"><code>{esc(example)}</code></pre>')
        out.append("</div></div>")
    out.append("</section>")
    return "\n".join(out)


def convert_legacy(section: str) -> dict | None:
    """Turn an older SVG diagram into a spec, keeping its words."""
    title = re.search(r"<h2[^>]*>(.*?)</h2>", section, re.S)
    panels = re.findall(
        r'data-dfd-diagram-panel="([^"]+)"[^>]*>(.*?)</div>', section, re.S
    )
    buttons = dict(
        re.findall(r'data-dfd-diagram-step="([^"]+)"[^>]*>(.*?)</button>', section, re.S)
    )
    if not title or not panels:
        return None
    steps = []
    node_sets = []
    for panel_id, body in panels:
        texts = re.findall(r"<text\b([^>]*)>(.*?)</text>", body, re.S)
        caption = re.search(r"<p\b[^>]*>(.*?)</p>", body, re.S)
        if not texts or not caption:
            return None
        labels = [html.unescape(re.sub(r"<[^>]+>", "", t)).strip() for _a, t in texts]
        active = [i for i, (attrs, _t) in enumerate(texts) if "#ffffff" in attrs.lower() or "#fff\"" in attrs.lower()]
        node_sets.append(labels)
        label = html.unescape(re.sub(r"<[^>]+>", "", buttons.get(panel_id, labels[0]))).strip()
        steps.append((label, active or [0], html.unescape(re.sub(r"<[^>]+>", "", caption.group(1))).strip(), labels))
    title_text = html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip()
    same_nodes = all(n == node_sets[0] for n in node_sets)
    if same_nodes:
        return {
            "title": title_text,
            "nodes": node_sets[0],
            "steps": [(lbl, act, cap, "") for lbl, act, cap, _n in steps],
        }
    # Each step shows its own three stages: render them as separate tracks.
    return {"title": title_text, "multi": [(lbl, nodes, act, cap) for lbl, act, cap, nodes in steps]}


def render_multi(spec: dict) -> str:
    steps = spec["multi"]
    total = len(steps)
    out = [
        '<section class="section dfd-diagram dfd-flow" data-dfd-diagram data-dfd-flow data-dfd-reveal>',
        f'<h2>{esc(spec["title"])}</h2>',
        f'<div class="dfd-diagram-controls dfd-flow-controls" role="group" aria-label="{esc(spec["title"])}: steps">',
    ]
    for index, (label, _nodes, _active, _cap) in enumerate(steps):
        pressed = "true" if index == 0 else "false"
        out.append(
            f'<button type="button" data-dfd-diagram-step="step{index + 1}" aria-pressed="{pressed}">'
            f'<span class="dfd-flow-num" aria-hidden="true">{index + 1}</span>{esc(label)}</button>'
        )
    out.append("</div>")
    for index, (label, nodes, active, caption) in enumerate(steps):
        hidden = "" if index == 0 else " hidden"
        out.append(f'<div class="dfd-flow-panel" data-dfd-diagram-panel="step{index + 1}"{hidden}>')
        out.append(f'<ol class="dfd-flow-track" aria-label="Step {index + 1}: {esc(label)}">')
        for position, name in enumerate(nodes):
            classes = ["dfd-flow-node", "is-active"] if position in active else ["dfd-flow-node"]
            state = ' aria-current="step"' if position in active else ""
            out.append(f'<li class="{" ".join(classes)}"{state}><span class="dfd-flow-label">{esc(name)}</span></li>')
        out.append("</ol>")
        out.append(
            f'<div class="dfd-flow-explain"><p class="dfd-flow-caption"><span class="dfd-flow-count">Step {index + 1} of {total}</span>{esc(caption)}</p></div></div>'
        )
    out.append("</section>")
    return "\n".join(out)


def main() -> int:
    written = converted = 0
    problems: list[str] = []
    for path in sorted(ROOT.glob("*/*.html")):
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith(("templates/", "node_modules/")):
            continue
        text = path.read_text(encoding="utf-8")
        match = SECTION_RE.search(text)
        if not match:
            if rel in SPECS:
                problems.append(f"{rel}: no diagram section to replace")
            continue
        if rel in SPECS:
            new = render(SPECS[rel])
            written += 1
        elif "data-dfd-flow" in match.group(0):
            continue
        else:
            spec = convert_legacy(match.group(0))
            if spec is None:
                problems.append(f"{rel}: diagram has no labels or captions; add it to SPECS")
                continue
            new = render_multi(spec) if "multi" in spec else render(spec)
            converted += 1
        if new != match.group(0):
            path.write_text(text[: match.start()] + new + text[match.end():], encoding="utf-8")
    print(f"written from specs: {written}; converted: {converted}")
    for line in problems:
        print("PROBLEM", line)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
