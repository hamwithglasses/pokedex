const GULP           = require('gulp');

//helpers
const PLUMBER        = require('gulp-plumber');
const RUNSEQUENCE    = require('run-sequence');
const RENAME         = require("gulp-rename");
const DEL            = require('del');
const INLINESOURCE   = require('gulp-inline-source');
const INCLUDE        = require('gulp-include');
const DATA           = require('gulp-data');
const IF             = require('gulp-if');
const CHANGED        = require('gulp-changed');
const CACHE          = require('gulp-cache');
const FILTER         = require('gulp-filter');

//styles
const SASS           = require('gulp-sass');
const AUTOPREFIXER   = require('gulp-autoprefixer');
const CSSBEAUTIFY    = require('gulp-cssbeautify');
const CSSNANO        = require('gulp-cssnano');

//views
const PUG            = require('gulp-pug');
const PUGINHERITANCE = require('gulp-pug-inheritance');
const HTMLPRETTIFY   = require('gulp-html-prettify');

//scripts
const UGLIFY         = require('gulp-uglify');

//media
//Coming soon.

//cosmetics
const BEEP           = require('beepbeep');
const NOTIFY         = require("gulp-notify");
const NOTIFIER       = require('node-notifier');
const BROWSERSYNC    = require('browser-sync').create();

//deploy
const GHPAGES        = require('gulp-gh-pages');





/***** variables *****/
//sources
var srcBase          = '_src/';
var srcStyles        = srcBase + '_styles/';
var srcScripts       = srcBase + '_scripts/';
var srcViews         = srcBase + '_views/';
var srcAssets        = [
	srcBase + '**/*',
	srcBase + '**/.*',

	//compiled files
	'!' + srcStyles,
	'!' + srcStyles + '**/*',
	'!' + srcViews,
	'!' + srcViews + '**/*',
	'!' + srcScripts,
	'!' + srcScripts + '**/*',

	//junk files
	'!' + srcBase + '**/.DS_Store',
	'!' + srcBase + '**/.Thumbs.db',
	'!' + srcBase + '**/.ehthumbs.db'
];

//directories
var dirTemp          = '_temp/';
var dirBuild         = 'build/';

//temp variables
var dataViews        = {base:{},context:{}};
var dev              = true;
var watch            = false;
var inline           = false;





/***** helpers *****/
var compileError = function(e) {
	BEEP();
	console.log( e.stack );

	NOTIFIER.notify({
		title: 'Gulp',
		message: 'Error with build.',
	});
}

var gazeError = function(e) {
	//https://github.com/gulpjs/gulp/issues/427
	//https://github.com/gulpjs/gulp/issues/651
	// silently catch 'ENOENT' error typically caused by renaming watched folders
	if (e.code === 'ENOENT') {
		console.log('Folder gaze error.');
		return;
	}
}

var viewsNesting = function(path) {
	if( path.indexOf('__') != 0 ) {
		var folders = path.split('__');

		if( path != 'index' ) {
			path = '';
			for(var i = 0; i < folders.length; i++) {
				path += '/' + folders[i];
			}
			path += '/'; //final slash
		}else{
			path = '/';
		}
	}else {
		path = '/';
	}

	return path;
}





/***** basic file handling *****/
GULP.task('cleanBuild', function() {
	return DEL.sync( dirBuild );
});

GULP.task('cleanTemp', function() {
	return DEL.sync( '_temp' );
});

GULP.task('copyFiles', function(){
	//excludes _styles, _scripts, & _views
	return GULP.src( srcAssets )
	.pipe( PLUMBER({
		errorHandler: compileError
	}) )
	.pipe( GULP.dest( dirBuild ) )


	//assets files copied!
	.pipe( IF( watch, BROWSERSYNC.reload({ stream: true }) ) )
	.pipe( PLUMBER.stop() )
});





/***** styles *****/
//Compiles sass files and exports minified and unminified css files
GULP.task('styles', function(){
	return GULP


	//get styles from srcStyles and make sass happen
	.src( srcStyles + '*.+(scss|sass|css)' ) //grabs scss sass and css files
	.pipe( PLUMBER({ errorHandler: compileError	}) )
	.pipe( SASS() )
	.pipe( AUTOPREFIXER({
		browsers: ['last 4 versions'],
		cascade: false
	}) )


	//unminified css
	.pipe( CSSBEAUTIFY() ) //pretty looking css for the unminified styles
	.pipe( RENAME(function (path) {
		//cleans up files that already have .min in the css file to prevent a double .min
		if(path.extname == '.css') {
			var newPath = path.basename;
			path.basename = newPath.split('.min').join('');
		}
	}))
	.pipe( GULP.dest( dirBuild + 'assets/css/' ) ) //saves unminified


	//minified css
	.pipe( RENAME({	suffix: ".min" }) ) //add .min
	.pipe( CSSNANO() ) //minify it!
	.pipe( GULP.dest( dirBuild + 'assets/css/' ) ) //saves minified


	//styles done!
	.pipe( IF( watch, BROWSERSYNC.reload({ stream: true }) ) )
	.pipe( PLUMBER.stop() )
});





/***** scripts *****/
GULP.task('scripts', function(callback) {
	return GULP


	//gets .js files for compile, will support .ts and maybe .coffee later
	.src( srcScripts + '*.+(js)' )
	.pipe( PLUMBER({ errorHandler: compileError }) )
	.pipe( INCLUDE() ) //includes/requires other files in export


	//unminified js
	.pipe( GULP.dest( dirBuild + 'assets/js/' ) )


	//minified js
	.pipe( UGLIFY() ) //make me ugly and small
	.pipe( RENAME({ suffix: ".min" }) ) //add .min
	.pipe( GULP.dest( dirBuild + 'assets/js/' ) )


	//js finished!
	.pipe( IF( watch, BROWSERSYNC.reload({ stream: true }) ) )
	.pipe( PLUMBER.stop() )
});





/***** views *****/
//finds all data in the /_views/data folder and includes it in compile
GULP.task('viewsData', function(){
	return GULP.src( srcViews + 'data/*.+(json)' )
	.pipe( DATA(function(file){
		//gets name of file excluding json extension
		var path = file.history[0].replace(file.base, '').split('.');
		path.pop();
		path = path.join('.');

		//passes data over in context as filename
		dataViews.context[path] = JSON.parse(file.contents.toString());
	}) )
});

//Compiles pug/jade and exports it into a temp folder
GULP.task('viewsCompile', function(){
	return GULP


	//gets all pug files (also supports jade still)
	.src( srcViews + '**/*.+(pug|jade)' )
	.pipe( PLUMBER({ errorHandler: compileError }) )


	//only compiles changed files
	.pipe( IF( watch, CHANGED( dirTemp, {extension: '.html'} ) ) )
	.pipe( IF( watch, PUGINHERITANCE({basedir: srcViews, skip: 'node_modules'}) ) )


	//passes data to pug file
	.pipe( DATA(function (file) {
		//gets filename
		var path = file.history[0].replace(file.base, '').split('.');
		path.pop();
		path = path.join('.');

		var base = {};

		//passes file path to pug file (really only needed for seo canonical)
		base.path = viewsNesting(path);

		//dev/dist flag
		base.dev = dev;

		dataViews.base = base; //passes base to use in pug files

		//you've got global data in your pug/jade files!
		return dataViews;
	}) )


	//compiles pug
	.pipe( PUG() )
	.pipe( HTMLPRETTIFY({
		indent_char: '	',
		indent_size: 1
	}) )


	//exports to temp file to compare unchanged files
	.pipe( FILTER(function (file) {
		return true;
		
		var p = file.path;
		p = p.replace(file.base, '').indexOf('/');

		if( p == -1 ) {
			return true;
		}

		return false;
	}) )
	.pipe( GULP.dest( dirTemp ) )


	//flat file renaming process
	.pipe( RENAME(function (path) {
		p = path.dirname;
		var newPath = path.basename; //gets file base name

		if( newPath.indexOf('__') != 0 ) { //files that start with __ are excluded from the flat file build convention
			path.basename = viewsNesting(path.basename) + 'index'; //new folder and index file for each file
		} else {
			path.basename = (path.basename).substring(2); //exports {{filename}}.html at the root
		}

	}) )
	.pipe( GULP.dest( dirBuild ) )


	.pipe( PLUMBER.stop() )
});

GULP.task('views', function(callback){
	RUNSEQUENCE(
		'viewsData',
		'viewsCompile',
		'serverReload',
		callback
	)
});





/***** server *****/
GULP.task('server', function() {
	BROWSERSYNC.init({
		server: {
			baseDir: 'build'
		},
		notify: false,
		ghostMode: false,
		open: false
	})
});

GULP.task('serverReload', function() {
	if(watch) {
		BROWSERSYNC.reload();
	}
});







//main tasks for user to run
GULP.task('build', function(callback){
	RUNSEQUENCE(
		['cleanBuild', 'cleanTemp'],
		['styles', 'scripts', 'views', 'copyFiles'],
		callback
	)
});

GULP.task('watch', ['server', 'build'], function (){
	watch = true;

	GULP.watch( srcStyles + '**/*', ['styles'] ).on('error', gazeError);
	GULP.watch( srcScripts + '**/*', ['scripts'] ).on('error', gazeError);
	GULP.watch( srcViews + '**/*', ['views'] ).on('error', gazeError);

	GULP.watch( srcAssets, ['copyFiles'] ).on('error', gazeError);
});



GULP.task('deploy', function() {
	return GULP.src('dist/**/*')
	.pipe( GHPAGES() );
});










GULP.task('devBuild', function(callback){
	inline = true;

	RUNSEQUENCE(
		['cleanBuild', 'cleanTemp'],
		['styles', 'scripts', 'copyFiles'],
		['stylesBuild', 'scriptsBuild', 'views'],
		'cleanTemp',
		callback
	)
});




GULP.task('dev', ['server', 'devBuild'], function(){
	GULP.watch( [srcBase + '**/*'], ['devBuild'] ).on('error', gazeError)
})

GULP.task('dist', function (callback) {
	dev = false;
	dirBuild = 'dist/';
	RUNSEQUENCE(
		'build'
	);
});



GULP.task('default', function() {
	console.log(' ');
	console.log('Hi there! Below are a few useful commands:');
	console.log(' ');
	console.log('watch: Builds and watches files for local development.');
	console.log('dev:   Similar to watch, but allows inlining assets and can be slower.');
	console.log('dist:  Just like dev but flagged for distribution.');
	console.log(' ');
});
