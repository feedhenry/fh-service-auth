module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      all: ['index.js', 'lib/**/*.js', 'test/**/**/*.js']
    },
    unit: 'mocha -A -u exports --recursive -t 10000  test/unit',

    unit_cover: 'istanbul cover --dir cov-unit _mocha -- -A -u exports --recursive -t 10000  test/unit'

  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.loadNpmTasks('grunt-contrib-jshint');
};
