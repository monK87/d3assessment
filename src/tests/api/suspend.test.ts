/**
 * POST /api/suspend
 * Header: Content-Type: application/json
 *
 * Expects HTTP 204 on success
 *
 * Suspend a student.
 *
 * Tests:
 * simple case
 * - existing student
 * - non-existing student
 * - emails should be case-insensitive
 *
 * error case
 * - missing student param
 * - student not email
 * - params not JSON
 */

import dotenv from 'dotenv'
import 'jest-extended'
import supertest from 'supertest'
import {getConnection} from 'typeorm/index'
import {Student} from '../../entities/Student'
import {app, callPost, createTestDbConnection, notEmails} from './helper'

dotenv.config()
const api = '/api/suspend'

// test using in test db - before every test, the database is cleared
beforeEach(() => createTestDbConnection())
afterEach(() => getConnection().close())

describe('POST api/suspend', () => {
    const studentEmail = 's1@student.com'

    // helper to call the api
    function callApi(student: any, code: number = 204): supertest.Test {
        return callPost(api, {student: student}, code)
    }


    describe('when suspending a student', () => {
        it('should suspend an existing student', async done => {
            await new Student(studentEmail).save()
            await callApi(studentEmail)
            const student = await Student.findOneOrFail({where: {email: studentEmail}})
            expect(student.isSuspended).toBeTrue()
            done()
        })

        it('should fail for non-existing student', async done => {
            await new Student('bogus@bogus.com').save()
            await callApi(studentEmail, 404)
            done()
        })

        it('should be case-insensitive', async done => {
            await new Student(studentEmail).save()
            await callApi(studentEmail.toUpperCase())
            const student = await Student.findOneOrFail({where: {email: studentEmail}})
            expect(student.isSuspended).toBeTrue()
            done()
        })
    })

    describe('when sending bad data', () => {
        // helper to call the api - expect to have a message
        async function callApiExpectErrorMsg(data: any) {
            const response = await callApi(data, 400)
            expect(response.body).toHaveProperty('message')
        }


        it('should fail when student is missing', async done => {
            const response = await callPost(api, {}, 400)
            expect(response.body).toHaveProperty('message')
            done()
        })

        it('should fail when student is not email', async done => {
            await Promise.all(notEmails.map(e => callApiExpectErrorMsg(e)))
            done()
        })

        it('should fail when type is not JSON', async done => {
            const response = await supertest(app).post(api)
                .set('Content-type', 'multipart/form-data')
                .field('student', 's1@student.com')
                .expect(400)
            expect(response.body).toHaveProperty('message')
            done()
        })
    })
})
