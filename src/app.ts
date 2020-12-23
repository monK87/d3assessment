import express, {Express} from 'express'
import morgan from 'morgan'
import helmet from 'helmet'
import {createConnection} from 'typeorm/index'
import {ApiController} from './controllers/api.controller'

// noinspection JSUnusedGlobalSymbols
/**
 * This application was written for the d3hiring assessment.
 *
 * It implements a simple API for teachers to perform simple administrative functions.
 *
 * The assessment can be found in the /docs/ folder.
 *
 * Refer to the README.md file to learn how to run this app.
 */
export class App {
    public expr: Express

    constructor() {
        this.connectDb()
        this.expr = express()
        this.initMiddlewares()
        this.initRoutes()

        // if we are providing a web interface, we need some view engine, and enable serving static contents
        // omitted here because assignment only requires API
    }

    public listen(host: string, port: number) {
        this.expr.listen(port, host, () => {
            return console.log(`Server is listening on ${host}:${port}`)
        })
    }

    private connectDb() {
        // skip database connection for tests - if they need one, they must do the connection
        if (process.env.NODE_ENV !== 'test')
            createConnection()
    }

    private initMiddlewares() {
        this.expr.use(express.json())
        this.expr.use(express.urlencoded({extended: false}))
        this.expr.use(morgan('dev')) // logger
        this.expr.use(helmet()) // takes care of various HTTP header
    }

    private initRoutes() {
        this.expr.get('/', (req, res) => {
            res.send('Please refer to the project README. There is no content here.')
        })
        this.expr.use('/api', new ApiController().router)
    }
}
