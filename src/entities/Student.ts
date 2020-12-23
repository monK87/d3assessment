import {ChildEntity, Column} from 'typeorm/index'
import {User} from './User'

@ChildEntity()
export class Student extends User {
    @Column()
    isSuspended: boolean

    constructor(email: string, isSuspended: boolean = false) {
        super(email)
        this.isSuspended = isSuspended
    }

    /**
     * Retrieve or create new Students with the given emails.
     * The new Students are not automatically saved.
     *
     * @param emails - case-insensitive emails array to search for
     */
    public static async findOrCreateByEmails(emails: string[]): Promise<Student[]> {
        if (emails.length === 0) return []
        if (emails.some(e => e.length === 0)) throw new Error('email cannot be empty')
        emails = emails.map(e => e.toLowerCase())

        // find existing students
        const existing = await this.queryByEmails(emails, Student).getMany()
        const existingEmails = new Set(existing.map(s => s.email))

        // create missing students
        const missingEmails = emails.filter(e => !existingEmails.has(e))
        const missing = missingEmails.map(e => new Student(e))

        return existing.concat(missing)
    }
}
