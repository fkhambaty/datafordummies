// Quiz Data for Apache Airflow Learning Website

// Subsection Quizzes (after each lesson)
const subsectionQuizzes = {
    'step1': {
        question: "What does DAG stand for in Apache Airflow?",
        options: [
            "Data Analysis Graph",
            "Directed Acyclic Graph",
            "Database Access Gateway",
            "Dynamic Application Graph"
        ],
        correct: 1,
        explanation: "DAG stands for Directed Acyclic Graph, which represents a workflow where tasks have dependencies but no circular references."
    },
    'step2': {
        question: "What is the purpose of 'catchup=False' in a DAG?",
        options: [
            "Makes the DAG run faster",
            "Prevents running missed intervals when DAG is unpaused",
            "Enables error handling",
            "Allows parallel execution"
        ],
        correct: 1,
        explanation: "catchup=False prevents Airflow from automatically running missed DAG intervals when a DAG is unpaused or started."
    },
    'step3': {
        question: "Which symbol is used to set task dependencies in Airflow?",
        options: [
            "-> (arrow)",
            ">> (right shift)",
            "| (pipe)",
            "+ (plus)"
        ],
        correct: 1,
        explanation: "The >> operator is used to set downstream dependencies between tasks in Airflow DAGs."
    },
    'step4': {
        question: "What is the purpose of 'max_active_runs=1' in a DAG configuration?",
        options: [
            "Limits CPU usage",
            "Prevents parallel DAG executions",
            "Sets retry limit",
            "Controls task timeout"
        ],
        correct: 1,
        explanation: "max_active_runs=1 ensures only one instance of the DAG runs at a time, preventing overlapping executions."
    },
    'step5': {
        question: "What trigger rule should be used after branching tasks?",
        options: [
            "all_success",
            "none_failed_or_skipped",
            "one_success",
            "all_failed"
        ],
        correct: 1,
        explanation: "none_failed_or_skipped is used after branching to handle tasks that were skipped due to the branching logic."
    },
    'step6': {
        question: "Which operator is used to execute Python functions in Airflow?",
        options: [
            "BashOperator",
            "PythonOperator",
            "EmailOperator",
            "SqlOperator"
        ],
        correct: 1,
        explanation: "Older DAGs use PythonOperator. New Airflow 3 Python tasks use the TaskFlow @task decorator from airflow.sdk."
    },
    'step7': {
        question: "What is a PostgresHook used for?",
        options: [
            "Creating databases",
            "Complex database operations and connections",
            "Sending emails",
            "File operations"
        ],
        correct: 1,
        explanation: "Hooks provide a high-level interface to external systems. PostgresHook manages PostgreSQL connections and operations."
    },
    'step8': {
        question: "What does the cron expression '0 2 * * *' mean?",
        options: [
            "Every 2 minutes",
            "Daily at 2:00 AM",
            "Every 2 hours",
            "2nd day of every month"
        ],
        correct: 1,
        explanation: "The cron expression '0 2 * * *' means run at minute 0 of hour 2, every day - so daily at 2:00 AM."
    },
    'step9': {
        question: "What is XCom used for in Airflow?",
        options: [
            "External communications",
            "Cross-task communication for small data",
            "Error handling",
            "Task scheduling"
        ],
        correct: 1,
        explanation: "XCom (Cross Communication) allows tasks to exchange small amounts of data with each other."
    },
    'step10': {
        question: "What is the purpose of poke_interval in sensors?",
        options: [
            "Sets timeout duration",
            "Defines how often to check the condition",
            "Sets retry attempts",
            "Controls task priority"
        ],
        correct: 1,
        explanation: "poke_interval determines how frequently (in seconds) a sensor checks if its condition is met."
    },
    'step11': {
        question: "What is TriggerRule.ONE_FAILED used for?",
        options: [
            "Task runs only if one upstream task fails",
            "Task runs if all upstream tasks fail",
            "Task runs if no upstream tasks fail",
            "Task always runs"
        ],
        correct: 0,
        explanation: "TriggerRule.ONE_FAILED makes a task run when at least one upstream task has failed."
    },
    'step12': {
        question: "What is the main benefit of using sensors in Airflow?",
        options: [
            "Faster execution",
            "Better logging",
            "Wait for external conditions before proceeding",
            "Reduced memory usage"
        ],
        correct: 2,
        explanation: "Sensors wait for external conditions (files, data, API responses) to be met before allowing downstream tasks to execute."
    },
    'step13': {
        question: "What is the primary purpose of data quality checks in production pipelines?",
        options: [
            "Improving performance",
            "Validating data integrity before downstream processing",
            "Reducing costs",
            "Faster deployment"
        ],
        correct: 1,
        explanation: "Data quality checks validate that the processed data meets expected standards before it's used by downstream systems."
    }
};

// Major Section Quizzes (at end of each main section)
const sectionQuizzes = {
    'basics': {
        title: "🎯 Airflow Basics Section Quiz",
        questions: [
            {
                question: "What is the correct way to define a DAG in Airflow?",
                options: [
                    "dag = DAG('my_dag', start_date=datetime(2025, 1, 1))",
                    "DAG my_dag = new DAG()",
                    "create_dag('my_dag')",
                    "dag = new DAG('my_dag')"
                ],
                correct: 0,
                explanation: "A DAG is created using the DAG class constructor with required parameters like dag_id and start_date."
            },
            {
                question: "Which parameter controls automatic retries for failed tasks?",
                options: [
                    "max_retries",
                    "retries",
                    "retry_count",
                    "auto_retry"
                ],
                correct: 1,
                explanation: "The 'retries' parameter in default_args or task definition controls how many times a failed task will be retried."
            },
            {
                question: "What does the schedule_interval parameter control?",
                options: [
                    "Task execution order",
                    "How often the DAG runs",
                    "Number of parallel tasks",
                    "Task timeout duration"
                ],
                correct: 1,
                explanation: "schedule_interval determines when and how often a DAG should be triggered to run."
            },
            {
                question: "In Airflow, what executes the actual work?",
                options: [
                    "DAGs",
                    "Schedulers",
                    "Tasks (Operators)",
                    "Hooks"
                ],
                correct: 2,
                explanation: "Tasks, which are instances of Operators, execute the actual work in an Airflow workflow."
            },
            {
                question: "What is the recommended way to pass small data between tasks?",
                options: [
                    "Global variables",
                    "Files",
                    "XCom",
                    "Database tables"
                ],
                correct: 2,
                explanation: "XCom (Cross Communication) is designed for passing small amounts of data between tasks."
            }
        ]
    },
    'dags': {
        title: "🎯 DAGs Mastery Quiz",
        questions: [
            {
                question: "What happens if you set catchup=True for a DAG?",
                options: [
                    "DAG runs immediately",
                    "DAG runs for all missed intervals since start_date",
                    "DAG runs twice as fast",
                    "DAG never runs"
                ],
                correct: 1,
                explanation: "catchup=True causes Airflow to schedule DAG runs for all intervals between start_date and current time."
            },
            {
                question: "Which is the correct syntax for setting multiple downstream tasks?",
                options: [
                    "task1 >> [task2, task3, task4]",
                    "task1 -> task2, task3, task4",
                    "task1.set_downstream([task2, task3, task4])",
                    "Both A and C"
                ],
                correct: 3,
                explanation: "Both >> operator with list syntax and set_downstream() method work for setting multiple downstream dependencies."
            },
            {
                question: "What is the purpose of tags in a DAG?",
                options: [
                    "Set execution order",
                    "Control permissions",
                    "Organize and filter DAGs in UI",
                    "Set retry behavior"
                ],
                correct: 2,
                explanation: "Tags help organize and filter DAGs in the Airflow web UI for better management."
            },
            {
                question: "When should you use BranchPythonOperator?",
                options: [
                    "For parallel task execution",
                    "For conditional workflow paths",
                    "For database operations",
                    "For file processing"
                ],
                correct: 1,
                explanation: "BranchPythonOperator is used to create conditional workflows where different paths are taken based on logic."
            },
            {
                question: "What does the DAG 'owner' parameter specify?",
                options: [
                    "Database owner",
                    "File permissions owner",
                    "Responsible person/team for the DAG",
                    "Process owner in OS"
                ],
                correct: 2,
                explanation: "The owner parameter identifies who is responsible for maintaining and monitoring the DAG."
            }
        ]
    },
    'operators': {
        title: "🎯 Operators & Hooks Quiz",
        questions: [
            {
                question: "What is the main difference between Operators and Hooks?",
                options: [
                    "Operators execute tasks, Hooks manage connections",
                    "Operators are faster than Hooks",
                    "Hooks are deprecated, use Operators",
                    "No difference, they're the same"
                ],
                correct: 0,
                explanation: "Operators define what tasks do, while Hooks provide interfaces to external systems and manage connections."
            },
            {
                question: "Which operator would you use to run a shell command?",
                options: [
                    "PythonOperator",
                    "BashOperator",
                    "ShellOperator",
                    "CommandOperator"
                ],
                correct: 1,
                explanation: "BashOperator is used to execute bash commands and shell scripts in Airflow tasks."
            },
            {
                question: "What is Jinja templating used for in Airflow?",
                options: [
                    "Creating DAG files",
                    "Dynamic content in task parameters",
                    "UI customization",
                    "Database connections"
                ],
                correct: 1,
                explanation: "Jinja templating allows dynamic content in task parameters, such as dates, variables, and context information."
            },
            {
                question: "Which context variable provides the execution date?",
                options: [
                    "{{ today }}",
                    "{{ ds }}",
                    "{{ now }}",
                    "{{ date }}"
                ],
                correct: 1,
                explanation: "{{ ds }} provides the execution date in YYYY-MM-DD format as a string."
            },
            {
                question: "What should you use for complex database operations?",
                options: [
                    "Only PostgresOperator",
                    "Only PostgresHook", 
                    "Combination of Operators and Hooks",
                    "Direct SQL queries"
                ],
                correct: 2,
                explanation: "Use PostgresOperator for simple SQL execution and PostgresHook for complex operations requiring custom logic."
            }
        ]
    },
    'scheduling': {
        title: "🎯 Scheduling & Triggers Quiz",
        questions: [
            {
                question: "What does the cron expression '*/15 * * * *' mean?",
                options: [
                    "Every 15 hours",
                    "Every 15 minutes",
                    "15th minute of every hour",
                    "Every 15 days"
                ],
                correct: 1,
                explanation: "*/15 in the minutes field means every 15 minutes (0, 15, 30, 45 minutes past each hour)."
            },
            {
                question: "Which schedule_interval value runs a DAG only once?",
                options: [
                    "@once",
                    "None",
                    "@daily",
                    "0"
                ],
                correct: 0,
                explanation: "@once is a special preset that schedules a DAG to run only once."
            },
            {
                question: "What is logical_date in Airflow 3?",
                options: [
                    "When the task actually runs",
                    "When the task was created", 
                    "The data interval start time",
                    "When the DAG was deployed"
                ],
                correct: 2,
                explanation: "The current names are logical_date and data_interval_start. execution_date is the old context name for the start of the data interval, not the wall clock."
            },
            {
                question: "How do you create a DAG that runs on weekdays only?",
                options: [
                    "'0 9 * * 1-5'",
                    "'0 9 * * MON-FRI'", 
                    "'* * * * 1-5'",
                    "Both A and B"
                ],
                correct: 3,
                explanation: "Both '0 9 * * 1-5' and '0 9 * * MON-FRI' schedule a DAG to run at 9 AM on weekdays (Monday-Friday)."
            },
            {
                question: "What is the purpose of timedelta scheduling?",
                options: [
                    "Set task timeouts",
                    "Regular interval scheduling",
                    "Control retry delays", 
                    "Set start dates"
                ],
                correct: 1,
                explanation: "timedelta objects are used for regular interval scheduling (e.g., every 30 minutes, every 2 hours)."
            }
        ]
    },
    'sensors': {
        title: "🎯 Sensors & Monitoring Quiz", 
        questions: [
            {
                question: "What is the main purpose of a FileSensor?",
                options: [
                    "Create files",
                    "Delete files", 
                    "Wait for files to exist",
                    "Read file contents"
                ],
                correct: 2,
                explanation: "FileSensor waits for a specific file to exist before allowing downstream tasks to execute."
            },
            {
                question: "What happens when a sensor times out?",
                options: [
                    "Task succeeds",
                    "Task fails",
                    "Task retries forever",
                    "DAG stops"
                ],
                correct: 1,
                explanation: "When a sensor reaches its timeout without the condition being met, the task fails."
            },
            {
                question: "What is the difference between 'poke' and 'reschedule' mode?",
                options: [
                    "No difference",
                    "Poke blocks worker, reschedule releases it", 
                    "Reschedule is faster",
                    "Poke is more accurate"
                ],
                correct: 1,
                explanation: "Poke mode blocks a worker slot while waiting, reschedule mode releases the worker slot between checks."
            },
            {
                question: "Which trigger rule is best for monitoring tasks?",
                options: [
                    "all_success",
                    "one_failed",
                    "none_failed_or_skipped",
                    "all_done"
                ],
                correct: 1,
                explanation: "one_failed trigger rule makes monitoring tasks run when any upstream task fails, perfect for alerting."
            },
            {
                question: "What should you include in failure callbacks?",
                options: [
                    "Only error messages",
                    "Context information and alerting",
                    "Complete data dumps",
                    "Task source code"
                ],
                correct: 1,
                explanation: "Failure callbacks should include relevant context (DAG, task, execution date) and trigger appropriate alerting mechanisms."
            }
        ]
    },
    'examples': {
        title: "🎯 Real-World Examples Quiz",
        questions: [
            {
                question: "In an ETL pipeline, what should happen if data quality checks fail?",
                options: [
                    "Continue processing",
                    "Stop pipeline and alert",
                    "Skip quality checks",
                    "Retry indefinitely"
                ],
                correct: 1,
                explanation: "Failed data quality checks should stop the pipeline and trigger alerts to prevent bad data from propagating."
            },
            {
                question: "What is the best practice for ML model deployment in Airflow?",
                options: [
                    "Deploy immediately after training",
                    "Manual deployment only", 
                    "Deploy after validation and approval gates",
                    "Never use Airflow for ML"
                ],
                correct: 2,
                explanation: "ML models should be validated for performance and pass approval gates before automated deployment."
            },
            {
                question: "How should you handle large datasets in Airflow tasks?",
                options: [
                    "Load everything into memory",
                    "Process in chunks/batches",
                    "Use only small datasets",
                    "Avoid large datasets"
                ],
                correct: 1,
                explanation: "Large datasets should be processed in chunks or batches to avoid memory issues and improve reliability."
            },
            {
                question: "What is the recommended approach for database connections?",
                options: [
                    "Hardcode connection strings",
                    "Use Airflow Connections",
                    "Store in task code",
                    "Use environment variables only"
                ],
                correct: 1,
                explanation: "Airflow Connections provide secure, centralized management of database and external system credentials."
            },
            {
                question: "When should you use SubDAGs?",
                options: [
                    "Always for organization",
                    "For reusable workflow patterns",
                    "Never, they're deprecated", 
                    "Only for simple tasks"
                ],
                correct: 2,
                explanation: "SubDAGs are largely deprecated in favor of TaskGroups for better performance and simpler debugging."
            }
        ]
    }
};

// Final Certification Quiz (before certificate)
const finalQuiz = {
    title: "🏆 Apache Airflow Certification Exam",
    description: "Answer all questions to earn your certificate! Mix of multiple choice and code writing.",
    passingScore: 20, // Out of 25 (80%)
    questions: [
        // SECTION 1: Airflow Basics (Questions 1-5)
        {
            type: "multiple-choice",
            question: "What is the correct way to create a basic DAG in Airflow?",
            options: [
                "dag = DAG('my_dag', start_date=datetime(2025, 1, 1))",
                "DAG my_dag = new DAG()",
                "create_dag('my_dag')",
                "dag = Workflow('my_dag')"
            ],
            correct: 0
        },
        {
            type: "code",
            question: "Write a DAG definition with dag_id 'hello_dag' and start_date of January 1, 2025.",
            placeholder: "# Write your DAG definition",
            correctAnswer: "dag = DAG('hello_dag', start_date=datetime(2025, 1, 1))",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('dag=dag(') && cleaned.includes('hello_dag') && 
                       cleaned.includes('start_date') && cleaned.includes('2025,1,1');
            }
        },
        {
            type: "multiple-choice",
            question: "What does 'catchup=False' do in a DAG?",
            options: [
                "Makes the DAG run faster",
                "Prevents running missed intervals", 
                "Enables parallel execution",
                "Disables the DAG"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write code to set task dependencies: task_a should run before task_b and task_c.",
            placeholder: "# Set the dependencies",
            correctAnswer: "task_a >> [task_b, task_c]",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().replace(/\s/g, '');
                return cleaned.includes('task_a>>[task_b,task_c]') || 
                       cleaned.includes('task_a>>task_b') && cleaned.includes('task_a>>task_c');
            }
        },
        {
            type: "multiple-choice",
            question: "Which operator is used to execute Python functions?",
            options: [
                "BashOperator",
                "PythonOperator", 
                "FunctionOperator",
                "CodeOperator"
            ],
            correct: 1
        },

        // SECTION 2: Operators & Tasks (Questions 6-10)
        {
            type: "code",
            question: "Create a PythonOperator task with task_id 'process_data' that calls function 'my_function'.",
            placeholder: "# Create the PythonOperator task",
            correctAnswer: "process_data = PythonOperator(task_id='process_data', python_callable=my_function, dag=dag)",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('pythonoperator') && cleaned.includes('task_id') && 
                       cleaned.includes('process_data') && cleaned.includes('python_callable');
            }
        },
        {
            type: "multiple-choice",
            question: "What is XCom used for in Airflow?",
            options: [
                "External system communication",
                "Cross-task data sharing",
                "Error handling",
                "Task scheduling"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write a BashOperator that executes the command 'echo Hello Airflow'.",
            placeholder: "# Create the BashOperator",
            correctAnswer: "bash_task = BashOperator(task_id='bash_hello', bash_command='echo Hello Airflow', dag=dag)",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('bashoperator') && cleaned.includes('bash_command') && 
                       cleaned.includes('echo');
            }
        },
        {
            type: "multiple-choice",
            question: "Which context variable provides the execution date as a string?",
            options: [
                "{{ execution_date }}",
                "{{ ds }}",
                "{{ today }}",
                "{{ run_date }}"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write code to access task context and return the execution date.",
            placeholder: "# Access context in a Python function",
            correctAnswer: "def my_function(**context): return context['ds']",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('**context') && cleaned.includes('context[') && 
                       (cleaned.includes("'ds'") || cleaned.includes('"ds"'));
            }
        },

        // SECTION 3: Scheduling (Questions 11-15)
        {
            type: "multiple-choice",
            question: "What does the cron expression '0 2 * * *' mean?",
            options: [
                "Every 2 minutes",
                "Daily at 2:00 AM",
                "Every 2 hours", 
                "2nd day of month"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write a cron expression for running every weekday at 9:00 AM.",
            placeholder: "# Cron expression",
            correctAnswer: "0 9 * * 1-5",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().replace(/\s/g, '');
                return cleaned === '09***1-5' || cleaned === '9***1-5' || 
                       cleaned === '09***MON-FRI';
            }
        },
        {
            type: "multiple-choice",
            question: "Which schedule_interval runs a DAG only once?",
            options: [
                "None",
                "@once", 
                "@daily",
                "single"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Create a DAG that runs every 30 minutes using timedelta.",
            placeholder: "# DAG with timedelta schedule",
            correctAnswer: "dag = DAG('my_dag', schedule_interval=timedelta(minutes=30), start_date=datetime(2025,1,1))",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('schedule_interval=timedelta') && 
                       cleaned.includes('minutes=30');
            }
        },
        {
            type: "multiple-choice",
            question: "What is logical_date in Airflow 3?",
            options: [
                "When task actually runs",
                "Data interval start time",
                "When DAG was created",
                "Current system time"
            ],
            correct: 1
        },

        // SECTION 4: Sensors & Monitoring (Questions 16-20)
        {
            type: "multiple-choice",
            question: "What is the main purpose of a FileSensor?",
            options: [
                "Create files",
                "Wait for files to exist",
                "Delete files",
                "Read file contents"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Create a FileSensor that waits for '/data/input.csv' with 60 second poke_interval.",
            placeholder: "# Create the FileSensor",
            correctAnswer: "sensor = FileSensor(task_id='wait_file', filepath='/data/input.csv', poke_interval=60, dag=dag)",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('filesensor') && cleaned.includes('filepath') && 
                       cleaned.includes('poke_interval=60');
            }
        },
        {
            type: "multiple-choice",
            question: "Which trigger rule makes a task run when any upstream task fails?",
            options: [
                "all_failed",
                "one_failed",
                "none_failed", 
                "any_failed"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write code to add a failure callback function 'alert_team' to a DAG's default_args.",
            placeholder: "# Add failure callback",
            correctAnswer: "default_args = {'on_failure_callback': alert_team}",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('on_failure_callback') && cleaned.includes('alert_team');
            }
        },
        {
            type: "multiple-choice",
            question: "What happens when a sensor times out?",
            options: [
                "Task succeeds",
                "Task fails", 
                "Task retries forever",
                "Task skips"
            ],
            correct: 1
        },

        // SECTION 5: Production & Best Practices (Questions 21-25)
        {
            type: "multiple-choice", 
            question: "What is the best practice for handling sensitive data in Airflow?",
            options: [
                "Hardcode in DAG files",
                "Use Airflow Variables and Connections",
                "Store in task logs",
                "Use comments in code"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Write code to set retries=3 and retry_delay=5 minutes in default_args.",
            placeholder: "# Set retry configuration", 
            correctAnswer: "default_args = {'retries': 3, 'retry_delay': timedelta(minutes=5)}",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('retries') && cleaned.includes('3') && 
                       cleaned.includes('retry_delay') && cleaned.includes('5');
            }
        },
        {
            type: "multiple-choice",
            question: "Which is recommended for large dataset processing?",
            options: [
                "Load all data into memory",
                "Process in chunks/batches",
                "Avoid large datasets", 
                "Use only small files"
            ],
            correct: 1
        },
        {
            type: "code",
            question: "Create a DAG with tags=['etl', 'production'] and description='Daily ETL'.",
            placeholder: "# DAG with metadata",
            correctAnswer: "dag = DAG('etl_dag', tags=['etl', 'production'], description='Daily ETL', start_date=datetime(2025,1,1))",
            validateAnswer: function(userCode) {
                const cleaned = userCode.trim().toLowerCase().replace(/\s/g, '');
                return cleaned.includes('tags=') && cleaned.includes('etl') && 
                       cleaned.includes('production') && cleaned.includes('description');
            }
        },
        {
            type: "multiple-choice",
            question: "What should you do if data quality checks fail in a production pipeline?",
            options: [
                "Continue processing",
                "Stop pipeline and alert",
                "Skip the checks",
                "Retry automatically"
            ],
            correct: 1
        }
    ]
};
