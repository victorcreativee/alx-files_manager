module.exports = {
    env: {
        browser: false,
        es6: true,
        node: true,
        mocha: true,
    },
    extends: ['airbnb-base'],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        'no-console': 'off',
        'no-underscore-dangle': 'off',
    },
};
