export = {
    "type": "mysql",
    "host": process.env.MYSQL_IP,
    "port": process.env.MYSQL_PORT,
    "username": process.env.MYSQL_USER,
    "password": process.env.MYSQL_PW,
    "database": process.env.MYSQL_DATABASE,
    "synchronize": true,
    "logging": false,
    "entities": [
        "src/entities/**/*.ts"
    ],
    "migrations": [
        "src/migration/**/*.ts"
    ]
}
