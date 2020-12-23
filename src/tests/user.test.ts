import * as typeorm from 'typeorm'
import 'jest-extended'
import {Teacher} from '../entities/Teacher'
import {Student} from '../entities/Student'

/**
 * Testing User (Teacher, Student) entity methods
 */
describe('User Entity', () => {
    // mocking - prevent typeorm from actually using the database
    (typeorm as any).getRepository = jest.fn()

    // makes `findOne` return the obj, or nothing
    function mockFindOne(obj: any = null) {
        (typeorm as any).getRepository.mockReturnValue({
            findOne: () => Promise.resolve(obj)
        })
    }

    describe('when finding or creating Teacher entity', () => {
        const id = 1
        const email = 't1@teacher.com'
        const teacher = new Teacher(email)
        teacher.id = id


        it('should reject empty strings', () => {
            expect(Teacher.findOrCreate('')).toReject()
        })

        it('should return existing Teacher if matches', async done => {
            mockFindOne(teacher)
            const res = await Teacher.findOrCreate(email)
            expect(res).toEqual(teacher)
            done()
        })

        it('should create new Teacher if no matches', async done => {
            mockFindOne()
            const res = await Teacher.findOrCreate(email)
            expect(res.id).toBeUndefined()
            expect(res.email).toBe(email)
            expect(res.students).toBeArrayOfSize(0)
            done()
        })

        it('should find with UPPERCASE email', async done => {
            mockFindOne(teacher)
            const res = await Teacher.findOrCreate(email.toUpperCase())
            expect(res).toEqual(teacher)
            done()
        })

        it('should create lowercase with UPPERCASE email', async done => {
            mockFindOne()
            const res = await Teacher.findOrCreate(email.toUpperCase())
            expect(res.id).toBeUndefined()
            expect(res.email).toBe(email)
            expect(res.students).toBeArrayOfSize(0)
            done()
        })
    })

    describe('when fetching a Student entity', () => {
        const allEmails = ['s1@student.com', 's2@student.com']
        // identify existing students by id and isSuspended=true
        const allStudents = allEmails.map((e, i) => {
            const student = new Student(e, true)
            student.id = i + 1
            return student
        })

        /**
         * Mock the database access to test the logic to create missing Students.
         */
        function mockDatabase(returns: any = null) {
            (typeorm as any).getRepository.mockReturnValue({
                createQueryBuilder: jest.fn(() => ({
                    where: jest.fn().mockReturnThis(),
                    getMany: () => Promise.resolve(returns)
                })),
            })
        }


        it('should handle empty array', async done => {
            const actual = await Student.findOrCreateByEmails([])
            expect(actual).toBeArray()
            expect(actual).toBeEmpty()
            done()
        })

        it('should reject empty string', async done => {
            await expect(Student.findOrCreateByEmails([...allEmails, ''])).toReject()
            done()
        })

        it('should find existing Students', async done => {
            const students = allStudents.slice(0, 2)
            const emails = students.map(s => s.email)
            mockDatabase(students)

            const actual = await Student.findOrCreateByEmails(emails)
            expect(actual).toIncludeSameMembers(students)
            done()
        })

        it('should create new Students', async done => {
            const students = allStudents.slice(0, 2)
            const emails = students.map(s => s.email)
            mockDatabase([])

            const actual = await Student.findOrCreateByEmails(emails)
            expect(actual).toBeArrayOfSize(2)
            for (const student of actual) {
                expect(student.id).toBeUndefined()
                expect(student.isSuspended).toBeFalse()
            }
            expect(actual.map(s => s.email)).toIncludeSameMembers(emails)
            done()
        })

        it('should find existing and create new Students', async done => {
            const existing = allStudents.slice(0, 1)
            const emails = allEmails.slice(0, 2)
            mockDatabase(existing)

            const actual = await Student.findOrCreateByEmails(emails)
            expect(actual).toBeArrayOfSize(2)
            expect(actual.map(s => s.email)).toIncludeSameMembers(emails)
            expect(actual).toIncludeSameMembers([
                existing[0],
                new Student(emails[1], false)
            ])
            done()
        })

        it('should find with UPPERCASE email', async done => {
            const students = allStudents.slice(0, 1)
            const emails = students.map(s => s.email)
            const uppercase = emails.map(e => e.toUpperCase())
            mockDatabase(students)

            const actual = await Student.findOrCreateByEmails(uppercase)
            expect(actual).toIncludeSameMembers(students)
            done()
        })

        it('should create lowercase with UPPERCASE email', async done => {
            const students = allStudents.slice(0, 1)
            const emails = students.map(s => s.email)
            const uppercase = emails.map(e => e.toUpperCase())
            mockDatabase([])

            const actual = await Student.findOrCreateByEmails(uppercase)
            expect(actual).toBeArrayOfSize(1)
            expect(actual[0].id).toBeUndefined()
            expect(actual[0].email).toBe(emails[0])
            expect(actual[0].isSuspended).toBeFalse()
            done()
        })
    })
})
