const {src, dest, parallel, series, watch} = require("gulp")

const gulpLoadPlugins = require("gulp-load-plugins")
const plugins = gulpLoadPlugins()
const sass = require('gulp-sass')(require('sass'));
const babel = require('gulp-babel');
const imagemin = require("gulp-imagemin")
const del = require("del")
const browserSync = require("browser-sync")
const minifyCss = require("gulp-clean-css")
const bs = browserSync.create()
const cwd = process.cwd()
let config = {
    build: {
        src: "src",
        dist: "dist",
        temp: "temp",
        public: "public",
        paths: {
            styles: "assets/styles/*.scss",
            scripts: "assets/scripts/*.js",
            htmls: "*.html",
            images: "assets/images/**",
            fonts: "assets/fonts/**",
        }
    }
}

try {
    const loadConfig = require(`${cwd}/gulp.config.js`)
    config = Object.assign(config, loadConfig)
} catch (e) {
}

const style = () => {
    return src(config.build.paths.styles, {base: config.build.src, cwd: config.build.src})
        .pipe(sass({outputStyle: "compressed"}).on('error', sass.logError))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

const script = () => {
    return src(config.build.paths.scripts, {base: config.build.src, cwd: config.build.src})
        .pipe(babel({
            presets: [require('@babel/preset-env')]
        }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

const html = () => {
    return src(config.build.paths.htmls, {base: config.build.src, cwd: config.build.src})
        .pipe(plugins.swig({data: config.data, defaults: {cache: false}}))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

const image = () => {
    return src(config.build.paths.images, {base: config.build.src, cwd: config.build.src})
        .pipe(imagemin())
        .pipe(dest(config.build.dist))
}

const font = () => {
    return src(config.build.paths.fonts, {base: config.build.src, cwd: config.build.src})
        .pipe(imagemin())
        .pipe(dest(config.build.dist))
}

const ext = () => {
    return src("**", {base: config.build.public, cwd: config.build.public}).pipe(dest(config.build.dist))
}

const clean = () => {
    return del([config.build.dist, config.build.temp])
}

const useref = () => {
    return src(`${config.build.temp}/${config.build.paths.htmls}`)
        .pipe(plugins.useref({searchPath: [config.build.temp, "."]}))
        .pipe(plugins.if('*.js', plugins.uglify()))
        .pipe(plugins.if('*.html', plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        })))
        .pipe(plugins.if("*.css", minifyCss()))
        .pipe(dest(config.build.dist))
}

const serve = () => {
    watch(config.build.paths.styles, {cwd: config.build.src}, style)
    watch(config.build.paths.scripts, {cwd: config.build.src}, script)
    watch(config.build.paths.htmls, {cwd: config.build.src}, html)
    watch([
        config.build.paths.images,
        config.build.paths.fonts,
    ], {cwd: config.build.src}, bs.reload)

    watch("**", {cwd: config.build.public}, bs.reload)

    bs.init({
        notify: false,
        port: 647,
        open: true, //默认 true
        // files: "dist/**",
        server: {
            baseDir: [config.build.temp, config.build.src, config.build.public],
            routes: {
                '/node_modules': "node_modules"
            }
        },
    })
}

const compile = parallel(style, script, html)
const dev = series(compile, serve)
const build = series(clean, parallel(series(compile, useref), image, font, ext))


module.exports = {
    dev,
    build,
    clean,
}