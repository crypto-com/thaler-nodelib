module.exports = function(_wallaby) {
    return {
        files: [
            'native/index.node',
            'lib/src/**/*.ts',
            {
                pattern: 'lib/src/**/*.spec.ts',
                ignore: true,
            },
        ],
        tests: ['lib/src/**/*.spec.ts'],
        testFramework: 'mocha',
        env: {
            type: 'node',
            runner: 'node',
        },
        workers: { recycle: true },
    };
};
