/**
 * GET /api/commonstudents
 * Params: teacher (one or more)
 *
 * Expects HTTP 200 on success
 *
 * Retrieve list of students that given teachers have in common.
 *
 * Tests:
 * success case
 * - 1 teacher with [0, 1, 2] students
 * - 2 teachers with [0, 1, 2] each
 *   - both teachers have 0 students
 *   - t1 has 0, t2 has 1 student
 *   - t1 has 1, t2 has 1 student (same student)
 *   - t1 has 2, t2 has 2 student (one shared student)
 * - 3 teachers with 2 shared
 *
 * edge case
 * - 1 teacher doesn't exist
 * - t1 doesn't exist, t2 has students
 * - emails should be case-insensitive
 *
 * error case
 * - missing teacher param
 * - teacher not email
 */

import dotenv from 'dotenv'
import 'jest-extended'
import supertest from 'supertest'
import {getConnection, getRepository} from 'typeorm/index'
import {Teacher} from '../../entities/Teacher'
import {Student} from '../../entities/Student'
import {allStudentEmails, allTeacherEmails, app, callGet, createTestDbConnection, notEmails} from './helper'

dotenv.config()
const api = '/api/commonstudents'

// test using db - before every test, the database is cleared
beforeEach(() => createTestDbConnection())
afterEach(() => getConnection().close())

describe('GET api/commonstudents', () => {
    // helper to call the api
    function callApi(teachers: any[], expectedCode: number = 200): supertest.Test {
        return callGet(api, {teacher: teachers}, expectedCode)
    }


    describe('when fetching common students', () => {
        it('should work for 1 teacher with 0 students', async done => {
            const teacherEmail = allTeacherEmails[0]
            await getRepository(Teacher).insert({email: teacherEmail})

            const {body: response} = await callApi([teacherEmail])

            expect(response).toHaveProperty('students')
            expect(response.students).toBeArrayOfSize(0)
            done()
        })

        it('should work for 1 teacher with 1 student', async done => {
            const teacherEmail = allTeacherEmails[0]
            const student = new Student(allStudentEmails[0])
            await Teacher.create({email: teacherEmail, students: [student]}).save()

            const {body: response} = await callApi([teacherEmail])

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers([student.email])
            done()
        })

        it('should work for 1 teacher with 2 students', async done => {
            const teacherEmail = allTeacherEmails[0]
            const students = allStudentEmails.slice(0, 2).map(e => new Student(e))
            await Teacher.create({email: teacherEmail, students: students}).save()

            const {body: response} = await callApi([teacherEmail])

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers(students.map(s => s.email))
            done()
        })

        it('should work for 2 teachers with 0 students', async done => {
            const teacherEmails = allTeacherEmails.slice(0, 2)
            await Promise.all(teacherEmails.map(e => new Teacher(e).save()))

            const {body: response} = await callApi(teacherEmails)

            expect(response).toHaveProperty('students')
            expect(response.students).toBeArrayOfSize(0)
            done()
        })

        it('should work for 2 teachers with 1 student each (not shared)', async done => {
            const students = allStudentEmails.slice(0, 2).map(e => new Student(e))
            for (const i in students) {
                await Teacher.create({email: allTeacherEmails[i], students: [students[i]]}).save()
            }

            const {body: response} = await callApi(allTeacherEmails.slice(0, 2))

            expect(response).toHaveProperty('students')
            expect(response.students).toBeArrayOfSize(0)
            done()
        })

        it('should work for t1 has 0, t2 has 1 student', async done => {
            await new Teacher(allTeacherEmails[0]).save()
            const student = new Student(allStudentEmails[0])
            await Teacher.create({email: allTeacherEmails[1], students: [student]}).save()

            const {body: response} = await callApi(allTeacherEmails.slice(0, 2))

            expect(response).toHaveProperty('students')
            expect(response.students).toBeArrayOfSize(0)
            done()
        })

        it('should work for t1 has 1, t2 has 1 student (same student)', async done => {
            const teacherEmails = allTeacherEmails.slice(0, 2)
            const student = await new Student(allStudentEmails[0]).save()
            for (const email of teacherEmails) {
                await Teacher.create({email: email, students: [student]}).save()
            }

            const {body: response} = await callApi(teacherEmails)

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers([student.email])
            done()
        })

        it('should work for t1 has 2, t2 has 2 student (one shared student)', async done => {
            const teacherEmails = allTeacherEmails.slice(0, 2)
            const studentEmails = allStudentEmails.slice(0, 3)
            const students = await Promise.all(studentEmails.map(e => new Student(e).save()))
            await Teacher.create({email: allTeacherEmails[0], students: students.slice(0, 2)}).save()
            await Teacher.create({email: allTeacherEmails[1], students: students.slice(1, 3)}).save()

            const {body: response} = await callApi(teacherEmails)

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers(studentEmails.slice(1, 2))
            done()
        })

        it('should work for 3 teachers with 2 shared students', async done => {
            const studentEmails = allStudentEmails.slice(0, 4)
            const students = await Promise.all(studentEmails.map(e => new Student(e).save()))
            const sharedStudents = students.slice(0, 2)
            const teachers = allTeacherEmails.slice(0, 3).map(e => Teacher.create({email: e, students: sharedStudents}))
            teachers[0].students.push(students[2])
            teachers[1].students.push(students[3])
            await Promise.all(teachers.map(t => t.save()))

            const {body: response} = await callApi(allTeacherEmails.slice(0, 3))

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers(sharedStudents.map(s => s.email))
            done()
        })
    })

    describe('when sending edge cases', () => {
        it('should fail if a teacher doesn\'t exist', async done => {
            // nothing in database
            await callApi([allTeacherEmails[0]], 404)
            done()
        })

        it('should fail if one of the teachers doesn\'t exist', async done => {
            // only one teacher
            await new Teacher(allTeacherEmails[0]).save()

            await callApi(allTeacherEmails.slice(0, 2), 404)
            done()
        })

        it('should be case-insensitive', async done => {
            const teacherEmail = allTeacherEmails[0]
            const student = new Student(allStudentEmails[0])
            await Teacher.create({email: teacherEmail, students: [student]}).save()

            const {body: response} = await callApi([teacherEmail.toUpperCase()], 200).expect(200)

            expect(response).toHaveProperty('students')
            expect(response.students).toIncludeSameMembers([student.email])
            done()
        })
    })

    describe('when sending bad data', () => {
        // helper to call the api - expect error with message
        async function callApiBad(data: any, expectedCode: number = 400) {
            const response = await callGet(api, {teacher: data}, expectedCode)
            expect(response.body).toHaveProperty('message')
        }


        it('should fail if teacher is missing', async done => {
            supertest(app).get(api).expect(400, done)
        })

        it('should fail if one of the teachers is not email', async done => {
            await Promise.all(notEmails.map(e => callApiBad(e)))
            done()
        })
    })
})
