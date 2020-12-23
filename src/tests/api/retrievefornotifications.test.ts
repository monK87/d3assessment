/**
 * POST /api/retrievefornotifications
 * Header: Content-Type: application/json
 *
 * Expects HTTP 200 on success
 *
 * Get a list of students that can receive a given notification.
 *
 * Assumption: Mentions of non-existing students are ignored.
 *
 * Tests:
 * success case
 * - teacher with no students, no mentions
 * - teacher with no students, other mentions
 * - teacher with students, no mentions
 * - teacher with students, other mentions
 * - teacher with students, mentions of own students
 * - teacher with 1 suspended student; 1 other mentioned suspended student
 * - teacher with 2 students (1 suspended); 2 other mentioned students (1 suspended)
 *
 * edge case
 * - mention non-existing students
 * - mention without email
 * - emails should be case-insensitive
 * - teacher doesn't exist
 *
 * error case
 * - missing teacher param
 * - missing notification param
 * - teacher not email
 * - notification not string
 * - params not JSON
 */

import dotenv from 'dotenv'
import 'jest-extended'
import supertest from 'supertest'
import {getConnection} from 'typeorm/index'
import {Teacher} from '../../entities/Teacher'
import {Student} from '../../entities/Student'
import {allStudentEmails, allTeacherEmails, callPost, createTestDbConnection, notEmails} from './helper'

dotenv.config()
const api = '/api/retrievefornotifications'

// test using db - before every test, the database is cleared
beforeEach(() => createTestDbConnection())
afterEach(() => getConnection().close())

describe('POST /api/retrievefornotifications', () => {
    // helper to call the api
    function callApi(teacher: string, notification: string, expectedCode: number = 200): supertest.Test {
        return callPost(api, {teacher: teacher, notification: notification}, expectedCode)
    }


    describe('when fetching common students', () => {
        it('should work for 1 teacher with 0 students, 0 mentions', async done => {
            const teacher = await new Teacher(allTeacherEmails[0]).save()

            const {body: response} = await callApi(teacher.email, 'Hello')

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toBeArrayOfSize(0)
            done()
        })

        it('should work for 1 teacher with 0 students, 2 mentions', async done => {
            const studentEmails = allStudentEmails.slice(0, 2)
            await Promise.all(studentEmails.map(e => new Student(e).save()))
            const teacher = await new Teacher(allTeacherEmails[0]).save()
            const mentions = studentEmails.map(e => '@' + e).join(' ')

            const {body: response} = await callApi(teacher.email, `Hello ${mentions}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers(studentEmails)
            done()
        })

        it('should work for 1 teacher with 1 student, 0 mentions', async done => {
            const student = new Student(allStudentEmails[0])
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: [student]}).save()

            const {body: response} = await callApi(teacher.email, `Hello`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers([student.email])
            done()
        })

        it('should work for 1 teacher with 1 student, 2 other mentions', async done => {
            const studentEmails = allStudentEmails.slice(0, 3)
            const students = await Promise.all(studentEmails.map(e => new Student(e).save()))
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: [students[0]]}).save()
            const mentions = studentEmails.slice(1, 3).map(e => '@' + e).join(' ')

            const {body: response} = await callApi(teacher.email, `Hello ${mentions}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers(studentEmails)
            done()
        })

        it('should work for 1 teacher with 2 students, 1 mention of own student, 1 other mention', async done => {
            const studentEmails = allStudentEmails.slice(0, 3)
            const students = await Promise.all(studentEmails.map(e => new Student(e).save()))
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: students.slice(0, 2)}).save()
            const mentions = studentEmails.slice(1, 3).map(e => '@' + e).join(' ')

            const {body: response} = await callApi(teacher.email, `Hello ${mentions}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers(studentEmails)
            done()
        })

        it('should work teacher with suspended student and mentioned suspended student', async done => {
            const studentEmails = allStudentEmails.slice(0, 2)
            const students = await Promise.all(studentEmails.map(e => new Student(e, true).save()))
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: [students[0]]}).save()

            const {body: response} = await callApi(teacher.email, `Hello @${studentEmails[1]}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toBeArrayOfSize(0)
            done()
        })

        it('should work teacher with suspended student and mentioned suspended student', async done => {
            const studentEmails = allStudentEmails.slice(0, 4)
            const students = await Promise.all(studentEmails.map((e, i) => new Student(e, i % 2 === 0).save()))
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: students.slice(0, 2)}).save()
            const mentions = studentEmails.slice(2, 4).map(e => '@' + e).join(' ')

            const {body: response} = await callApi(teacher.email, `Hello ${mentions}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers([studentEmails[1], studentEmails[3]])
            done()
        })
    })

    describe('when sending edge cases', () => {
        it('should ignore non-existing student in mentions', async done => {
            const studentEmails = allStudentEmails.slice(0, 3)
            const students = studentEmails.slice(0, 2).map(e => new Student(e))
            const teacher = await Teacher.create({email: allTeacherEmails[0], students: students}).save()

            const {body: response} = await callApi(teacher.email, `Hello @${studentEmails[2]}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers(students.map(s => s.email))
            done()
        })

        it('should ignore @mentions that do not contain email', async done => {
            await new Student('s1@student.com').save()
            const teacher = await new Teacher(allTeacherEmails[0]).save()

            async function expectNoRecipients(mention: string) {
                const {body: response} = await callApi(teacher.email, `Hello ${mention}`)
                expect(response).toHaveProperty('recipients')
                expect(response.recipients).toBeArrayOfSize(0)
            }

            await expectNoRecipients('s1@student.com')
            await expectNoRecipients('@s1@student')
            await expectNoRecipients('@s1@.com')
            await expectNoRecipients('@@student.com')
            await expectNoRecipients('@')
            done()
        })

        it('should be case-insensitive in mentions', async done => {
            const student = await new Student(allStudentEmails[0]).save()
            const teacher = await new Teacher(allTeacherEmails[0]).save()
            const {body: response} = await callApi(teacher.email, `Hello @${student.email.toUpperCase()}`)

            expect(response).toHaveProperty('recipients')
            expect(response.recipients).toIncludeSameMembers([student.email])
            done()
        })

        it('should fail if teacher doesn\'t exist', async done => {
            const response = await callApi('not@teacher.com', 'Hello', 404)
            expect(response.body).toHaveProperty('message')
            done()
        })
    })

    describe('when sending bad data', () => {
        // helper to call the api
        async function callApiBad(data: any) {
            const response = await callPost(api, data, 400)
            expect(response.body).toHaveProperty('message')
        }

        it('should fail if teacher is missing', () => {
            callApiBad({notification: 'Hello'})
        })

        it('should fail if notification is missing', async done => {
            const teacher = await new Teacher(allTeacherEmails[0]).save()
            await callApiBad({teacher: teacher.email})
            done()
        })

        it('should fail if teacher not email', async done => {
            await Promise.all(notEmails.map(e => callApiBad({teacher: e})))
            done()
        })

        it('should fail if notification not string', async done => {
            const teacher = await new Teacher(allTeacherEmails[0]).save()
            await callApiBad({teacher: teacher.email, notification: null})
            await callApiBad({teacher: teacher.email, notification: []})
            await callApiBad({teacher: teacher.email, notification: 42})
            await callApiBad({teacher: teacher.email, notification: ['']})
            done()
        })
    })
})
