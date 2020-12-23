import {ChildEntity, getRepository, JoinTable, ManyToMany} from 'typeorm/index'
import {User} from './User'
import {Student} from './Student'

@ChildEntity()
export class Teacher extends User {
    @ManyToMany(type => Student, {
        eager: true,
        cascade: true
    })
    @JoinTable({
        name: 'teacher_students',
        joinColumn: {
            name: 'teacher'
        },
        inverseJoinColumn: {
            name: 'student'
        }
    })
    students!: Student[]

    constructor(email: string) {
        super(email)
    }

    /**
     * Retrieve or create a new Teacher with the given email.
     * The new Teacher is not automatically saved.
     *
     * @param email - case-insensitive email to search for
     */
    public static async findOrCreate(email: string): Promise<Teacher> {
        if (email.length === 0) throw new Error('email cannot be empty')
        email = email.toLowerCase()

        let teacher = await getRepository(Teacher).findOne({where: {email: email}})
        if (!teacher) {
            teacher = new Teacher(email)
            teacher.students = []
        }
        return teacher
    }
}
