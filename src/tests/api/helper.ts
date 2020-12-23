import dotenv from 'dotenv'
import 'jest-extended'
import supertest from 'supertest'
import {createConnection} from 'typeorm/index'
import {User} from '../../entities/User'
import {Teacher} from '../../entities/Teacher'
import {Student} from '../../entities/Student'
import {App} from '../../app'

dotenv.config()

export const allTeacherEmails = ['t1@teacher.com', 't2@teacher.com', 't3@teacher.com']
export const allStudentEmails = ['s1@student.com', 's2@student.com', 's3@student.com', 's4@student.com']
export const notEmails = [null, 42, '', [], [''], '@student.com', 's1@.com', 's1@student.']

export const app = new App().expr

/**
 * Helper to send a POST to the API with given data and expect a given response code.
 */
export function callPost(api: string, data: any, expectCode: number): supertest.Test {
    return supertest(app).post(api).send(data).expect(expectCode)
}

/**
 * Helper to send a GET to the API with given query and expect a given response code.
 */
export function callGet(api: string, query: any, expectCode: number): supertest.Test {
    return supertest(app).get(api).query(query).expect(expectCode)
}

/**
 * Helper to check that all emails of the given Users match. Will check both size and content.
 */
export function expectUserEmails(users: User[], emails: string[]) {
    expect(users).toBeArrayOfSize(emails.length)
    expect(users.map(u => u.email)).toIncludeSameMembers(emails)
}

/**
 * Creates a connection to the test database. It will drop the existing schema!
 */
export function createTestDbConnection() {
    return createConnection({
        type: 'mysql',
        host: process.env.MYSQL_IP || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || '3306'),
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PW,
        database: process.env.TEST_MYSQL_DATABASE,
        dropSchema: true,
        entities: [User, Teacher, Student],
        synchronize: true,
        logging: false
    })
}
