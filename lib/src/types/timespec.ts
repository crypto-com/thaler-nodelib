import ow from 'ow';

/**
 * Rust compatible time types
 */
export class Timespec {
    private seconds: number;

    private constructor(seconds: number) {
        this.seconds = seconds;
    }

    /**
     * Creates an instance of Timespec from seconds
     * @param {number} seconds Seconds since UNIX epoch
     * @memberof Timespec
     */
    public static fromSeconds(seconds: number): Timespec {
        ow(seconds, 'seconds', ow.number.positive.integer);

        return new Timespec(seconds);
    }

    /**
     * Returns Timespec in number representation
     */
    public toNumber(): number {
        return this.seconds;
    }
}

export const owTimespec = ow.object.instanceOf(Timespec);
export const owOptionalTimespec = ow.optional.object.instanceOf(Timespec);
