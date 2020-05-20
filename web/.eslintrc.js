module.exports = {
    'env': {
        'browser': true,
        'es6': false,
        'es2017': false,
        'es2020': false,
    },
    'plugins': ['es'],
    'extends': [
      'eslint:recommended',
      'plugin:es/no-2018',
      'plugin:es/no-2017',
      'plugin:es/no-2016',
      'plugin:es/no-2015',
    ],
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly',
    },
    'parserOptions': {
        'ecmaVersion': 5,
        'sourceType': 'script',
        'ecmaFeatures': {},
    },
    'rules': {
        'indent': ['error', 2, {
          'SwitchCase': 1,
        }],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'eqeqeq': ['error', 'always'],

        // DEBUG ONLY
        'no-unused-vars': ['off'],
    }
};
