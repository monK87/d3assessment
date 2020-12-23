/**
 * POST /api/register
 * Header: Content-Type: application/json
 *
 * Expects HTTP 204 on success
 *
 * Register students to a teacher.
 *
 * Assumption: Teacher and Students are created if they don't exist.
 * Assumption: Teacher can appear as Students to other Teachers.
 *
 * Tests need to cover:
 * simple case
 * - 1 student
 * - 2 students
 * - registering existing students to new teacher
 *
 * edge case
 * - registering same students again to same teacher
 * - emails should be case-insensitive
 * - student and teacher are the same
 *
 * error case
 * - missing teacher param
 * - missing student param
 * - teacher not email
 * - student not email
 * - student array empty
 * - params not JSON
 */

import dotenv from 'dotenv'
import 'jest-extended'
import supertest from 'supertest'
import {getConnection, getRepository} from 'typeorm/index'
import {Teacher} from '../../entities/Teacher'
import {
    allStudentEmails,
    allTeacherEmails,
    app,
    callPost,
    createTestDbConnection,
    expectUserEmails,
    notEmails
} from './helper'

dotenv.config()
const api = '/api/register'

// test using db - before every test, the database is cleared
beforeEach(() => createTestDbConnection())
afterEach(() => getConnection().close())

describe('POST api/register', () => {
    // helper to call the api
    function callApi(teacher: string, students: string[], expectedCode: number = 204): supertest.Test {
        return callPost(api, {teacher: teacher, students: students}, expectedCode)
    }


    describe('when registering a student', () => {
        it('should register 1 student at a time', async done => {
            const teacherEmail = allTeacherEmails[0]
            const studentEmails = allStudentEmails.slice(0, 2)

            await callApi(teacherEmail, [studentEmails[0]])

            // check db - should have 1 teacher with 1 student
            let actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, [teacherEmail])
            expectUserEmails(actualTeachers[0].students, [studentEmails[0]])

            // add another
            await callApi(teacherEmail, [studentEmails[1]])

            // check db - should now have two students on one teacher
            actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, [teacherEmail])
            expectUserEmails(actualTeachers[0].students, studentEmails)
            done()
        })

        it('should register 2 students at once', async done => {
            const teacherEmail = allTeacherEmails[0]
            const studentEmails = allStudentEmails.slice(0, 2)

            await callApi(teacherEmail, studentEmails)

            // check db - should have 1 teacher with 2 students
            const actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, [teacherEmail])
            expectUserEmails(actualTeachers[0].students, studentEmails)
            done()
        })

        it('should work with 2 teachers', async done => {
            const teacherEmails = allTeacherEmails.slice(0, 2)
            const studentEmails = allStudentEmails.slice(0, 2)

            await callApi(teacherEmails[0], [studentEmails[0]])
            await callApi(teacherEmails[1], [studentEmails[1]])

            // check db - should have 2 teachers with 1 student each
            const actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, teacherEmails)
            for (const i in actualTeachers) {
                expectUserEmails(actualTeachers[i].students, [studentEmails[i]])
            }
            done()
        })
    })

    describe('when sending edge cases', () => {
        it('should not change anything if the student is already registered to the teacher', async done => {
            const teacherEmail = allTeacherEmails[0]
            const studentEmails = allStudentEmails.slice(0, 1)

            // call twice
            await callApi(teacherEmail, studentEmails)
            await callApi(teacherEmail, studentEmails)

            // check db - should just be 1 teacher with 1 student
            const actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, [teacherEmail])
            expectUserEmails(actualTeachers[0].students, studentEmails)
            done()
        })

        it('should be case-insensitive', async done => {
            // send two registrations with lower and uppercase mixed
            const teacherEmail = allTeacherEmails[0]
            const studentEmails = allStudentEmails.slice(0, 1)

            // call with mixed casing
            await callApi(teacherEmail.toUpperCase(), studentEmails)
            await callApi(teacherEmail, studentEmails.map(e => e.toUpperCase()))

            // check db - should just be 1 teacher with 1 student, emails in lowercase
            const actualTeachers = await getRepository(Teacher).find()
            expectUserEmails(actualTeachers, [teacherEmail])
            expectUserEmails(actualTeachers[0].students, studentEmails)
            done()
        })

        it('should fail if teacher and student are the same', async done => {
            await callApi(allTeacherEmails[0], [allTeacherEmails[0]], 400)
            done()
        })
    })

    describe('when sending bad data', () => {
        // helper to call api, expect error with message
        async function callApiBad(data: any) {
            const response = await callPost(api, data, 400)
            expect(response.body).toHaveProperty('message')
        }


        it('should fail when teacher is missing', async done => {
            await callApiBad({students: allStudentEmails})
            done()
        })

        it('should fail when student is missing', async done => {
            await callApiBad({teacher: allTeacherEmails[0]})
            done()
        })

        it('should fail when teacher is not email', async done => {
            await Promise.all(notEmails.map(e =>
                callApiBad({teacher: e, students: allStudentEmails})))
            done()
        })

        it('should fail when student is not email', async done => {
            await Promise.all(notEmails.map(e =>
                callApiBad({teacher: allTeacherEmails[0], students: e})))
            done()
        })

        it('should fail when student array is empty', async done => {
            await callApiBad({teacher: allTeacherEmails[0], students: []})
            done()
        })

        it('should fail when type is not JSON', async done => {
            const response = await supertest(app).post(api)
                .set('Content-type', 'multipart/form-data')
                .field('teacher', 't1@teacher.com')
                .field('students', 's1@student.com')
                .expect(400)
            expect(response.body).toHaveProperty('message')
            done()
        })
    })
})
