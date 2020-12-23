import {Request, Response, Router} from 'express'
import {body, header, oneOf, query} from 'express-validator'
import {createQueryBuilder, getRepository} from 'typeorm/index'
import {Teacher} from '../entities/Teacher'
import {Student} from '../entities/Student'
import {validationMw} from '../middleware/validation.middleware'

// noinspection SpellCheckingInspection
export class ApiController {
    public router = Router()

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post('/register',
            this.registerStudentsValidators,
            validationMw,
            this.registerStudents)

        this.router.get('/commonstudents',
            this.listCommonStudentsValidators,
            validationMw,
            this.listCommonStudents)

        this.router.post('/suspend',
            this.suspendStudentValidators,
            validationMw,
            this.suspendStudent)

        this.router.post('/retrievefornotifications',
            this.listStudentsForNotificationValidators,
            validationMw,
            this.listStudentsForNotification)
    }

    // --- POST /register ---

    private registerStudentsValidators = [
        header('Content-Type').equals('application/json'),
        body('teacher', 'must be email address').isEmail(),
        body('students', 'must be array of email addresses').isArray({min: 1}),
        body('students.*', 'must be email addresses').isEmail()
    ]

    /**
     * Register a list of students to a teacher.
     */
    private async registerStudents(req: Request, res: Response) {
        const teacherEmail = req.body.teacher
        const studentEmails: string[] = req.body.students

        // make sure the teacher is not also in the student list
        if (studentEmails.includes(teacherEmail))
            return res.status(400).json({message: 'teacher and student cannot be the same'})

        // we create all missing users when needed
        let teacher = await Teacher.findOrCreate(teacherEmail)
        let students = await Student.findOrCreateByEmails(studentEmails)

        // add students that are not registered to this teacher
        const currentStudentEmails = new Set(teacher.students.map(s => s.email))
        students.filter(s => !currentStudentEmails.has(s.email))
            .forEach(s => teacher.students.push(s))

        try {
            await teacher.save()
        } catch (e) {
            console.log('error on saving: ' + e)
            return res.status(500).send()
        }
        res.status(204).send()
    }

    // --- GET /commonstudents ---

    private listCommonStudentsValidators = oneOf([
        [query('teacher').isArray({min: 1}), query('teacher.*').isEmail()],
        query('teacher').isEmail()
    ], 'must have at one or more teacher (every value must be an email)')

    /**
     * Retrieve a list of students that are registered to all of the given teachers.
     */
    private async listCommonStudents(req: Request, res: Response) {
        const teacherQuery = req.query.teacher
        const emails: string[] = []

        // teacher query may come as single value or as array
        if (Array.isArray(teacherQuery)) {
            // multiple teachers as array
            for (let q of teacherQuery) emails.push(String(q))
        } else {
            // single teacher
            emails.push(String(teacherQuery))
        }

        // optimization possible by selecting only students from the teacher
        const teachers = await createQueryBuilder(Teacher, 't')
            .leftJoinAndSelect('t.students', 'students')
            .where('t.email IN (:...emails)', {emails: emails})
            .getMany()
        if (teachers.length < emails.length) return res.status(404).json({message: 'teacher not found'})

        // convert to array of arrays with student emails
        const studentLists = teachers.map(t => t.students.map(s => s.email))

        // there are no students
        if (studentLists.length === 0) return res.json({students: []})

        // intersect arrays of student emails
        const intersect = studentLists.reduce((a, b) => a.filter(elem => b.includes(elem)))
        res.json({students: intersect})

        // This is likely also solvable with an intersect-style query.
        // The readability of that might be bad though, so I opted for an easier to
        // understand step-by-step process after fetching all records.
        // Unless there are issues with speed, this will be the easier to understand option.
    }

    // --- POST /suspend ---

    private suspendStudentValidators = [
        header('Content-Type').equals('application/json'),
        body('student').isString(),
        body('student').isEmail()
    ]

    /**
     * Suspends a student
     */
    private async suspendStudent(req: Request, res: Response) {
        const studentEmail = req.body.student
        const student = await Student.findOne({email: studentEmail})
        if (!student) return res.status(404).send({message: 'student not found'})
        student.isSuspended = true

        try {
            await student.save()
        } catch (e) {
            console.log('error on saving: ' + e)
            return res.status(500).send()
        }
        res.status(204).send()
    }

    // --- POST /retrievefornotifications ---

    private listStudentsForNotificationValidators = [
        header('Content-Type').equals('application/json'),
        body('teacher').isEmail(),
        body('notification').isString()
    ]

    /**
     * Retrieve a list of students that can receive notifications from a given teacher
     */
    private async listStudentsForNotification(req: Request, res: Response) {
        const teacherEmail = req.body.teacher
        const notification = req.body.notification

        const teacher = await Teacher.findOne({where: {email: teacherEmail}})
        if (!teacher) return res.status(404).json({message: 'teacher not found'})

        // get all student emails of teacher that are not suspended
        const studentEmails = teacher.students
            .filter(s => !s.isSuspended)
            .map(s => s.email)

        // get all @mentioned student emails from text that are not suspended
        // this is a very basic regex for emails. Something more sophisticated should be used
        const emailRegex = /(?<=@)(\S+@\S+\.\S+)/gi
        const matches = notification.match(emailRegex)
        if (matches) {
            const mentioned = await getRepository(Student)
                .createQueryBuilder('u')
                .where('u.isSuspended = 0 AND u.email IN (:...emails)',
                    {emails: matches})
                .getMany()
            if (mentioned.length > 0) {
                studentEmails.push(...mentioned.map(u => u.email))
            }
        }

        // remove duplicate student emails before sending
        res.json({recipients: [...new Set(studentEmails)]})
    }
}
