const fs = require('fs');
const path = require('path');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const WebPlugin = require('./WebPlugin');
const util = require('./util');

/**
 * list only dir in dir
 * @param dir dir hold dir list
 * @returns {Array}
 */
function getDirsInDir(dir) {
    const files = fs.readdirSync(dir);
    const ret = [];
    files.forEach(fileName => {
        if (fs.lstatSync(path.resolve(dir, fileName)).isDirectory()) {
            ret.push(fileName);
        }
    });
    return ret;
}

class AutoWebPlugin {

    /**
     *
     * @param pageDir the dir hold all pages
     * @param options
     * options.template {string,function}
     *      get WebPlugin template
     *      typeof===string: template config is html template file full path
     *      typeof===function: template config is function,ask user for detail
     *
     * options.entity {string,function,*}
     *      get page entityPath
     *      typeof===string: entity config is entity file full path
     *      typeof===function: entity config is function,ask user for detail
     *
     * options.filename {function,*}
     *      get WebPlugin output filename,default filename is pageName
     *      set options.filename as function(pageName)=>filename to add custom logic
     *
     * options.commonsChunk {string}
     *      get all pages's commons chunk,output chunk filename
     *
     * options.preEntrys {Array}
     *      entry files pre append to page entry for every page
     *
     * options.postEntrys {Array}
     *      entry files post append to page entry for every page
     *
     * options.stylePublicPath {string}
     *      publicPath for css file,for js file will use webpack.publicPath
     */
    constructor(pageDir, options) {
        options = Object.assign({}, options);
        this.options = options;
        const { template, entity, filename } = options;
        const pageNames = getDirsInDir(pageDir);
        const entityMap = {};
        // find out all page entry in pageDir,and get every page's html template path and js entityPath
        pageNames.forEach(pageName => {
            entityMap[pageName] = {}

            // get WebPlugin template
            if (typeof template === 'string') {
                // template config is html template file full path
                entityMap[pageName].template = template;
            } else if (typeof template === 'function') {
                // template config is function,ask user for detail
                entityMap[pageName].template = template(pageName)
            }

            // get page entityPath
            if (typeof entity === 'string' && entity.length > 0) {
                // entity config is entity file full path
                entityMap[pageName].entityPath = entity
            } else if (typeof entity === 'function') {
                // entity config is function,ask user for detail
                entityMap[pageName].entityPath = entity(pageName)
            } else {
                // use page dir's index.js or index.jsx as page entry
                entityMap[pageName].entityPath = path.resolve(pageDir, pageName, '')
            }

            // get WebPlugin output filename,default filename is pageName
            // set options.filename as function(pageName)=>filename to add custom logic
            if (typeof filename === 'function') {
                entityMap[pageName].filename = filename(pageName);
            } else {
                entityMap[pageName].filename = pageName;
            }
        });
        this.entityMap = entityMap;
    }

    apply(compiler) {
        global._isProduction = util.isProduction(compiler);
        global._isExtractStyle = util.isExtractStyle(compiler);
        const { options } = compiler;
        const { entityMap } = this;
        const { commonsChunk, preEntrys, postEntrys, stylePublicPath } = this.options;
        const useCommonsChunk = typeof commonsChunk === 'string';
        Object.keys(entityMap).forEach(entityName => {
            const { template, entityPath } = entityMap[entityName];
            let pageEntryArray = [entityPath];
            if (Array.isArray(preEntrys)) {
                pageEntryArray = preEntrys.concat(pageEntryArray);
            }
            if (Array.isArray(postEntrys)) {
                pageEntryArray = pageEntryArray.concat(postEntrys);
            }
            // add entityMap from pages to webpack entry
            options.entry[entityName] = pageEntryArray;
            // add an WebPlugin for every page to output an html
            new WebPlugin({
                template: template,
                filename: `${entityName}.html`,
                requires: useCommonsChunk ? [commonsChunk, entityName] : [entityName],
                stylePublicPath
            }).apply(compiler);
        });
        if (useCommonsChunk) {
            // get all pages's commons chunk
            new CommonsChunkPlugin({
                name: commonsChunk,
                chunks: Object.keys(entityMap)
            }).apply(compiler);
        }
    }

}

module.exports = AutoWebPlugin;