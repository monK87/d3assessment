import {
    BaseEntity,
    Column,
    Entity,
    EntityTarget,
    getRepository,
    PrimaryGeneratedColumn,
    SelectQueryBuilder,
    TableInheritance,
    Unique
} from 'typeorm/index'

@Entity()
@Unique(['email'])
@TableInheritance({column: {type: 'varchar', name: 'type'}})
export abstract class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    email!: string

    constructor(email: string) {
        super()
        this.email = email
    }

    /**
     * Starts a SelectQueryBuilder that matches against a list of emails.
     */
    static queryByEmails<T extends User>(
        emails: string[],
        type: EntityTarget<T>
    ): SelectQueryBuilder<T> {
        return getRepository(type)
            .createQueryBuilder('u')
            .where('u.email IN (:...emails)', {emails: emails})
    }
}
